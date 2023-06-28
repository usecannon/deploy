import 'react-diff-view/style/index.css'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import {
  Hex,
  TransactionRequestBase,
  encodePacked,
  keccak256,
  stringToBytes,
  toHex,
  trim,
  zeroAddress,
} from 'viem'
import {
  useContractRead,
  useContractWrite,
  usePrepareSendTransaction,
  useSendTransaction,
} from 'wagmi'
import { useEffect, useState } from 'react'

import * as onchainStore from '../utils/onchain-store'
import { EditableAutocompleteInput } from '../components/EditableAutocompleteInput'
import { useCannonBuild, useLoadCannonDefinition } from '../hooks/cannon'
import { useGitDiff, useGitFilesList, useGitRefsList } from '../hooks/git'
import { useStore } from '../store'
import { useTxnStager } from '../hooks/backend'
import { makeMultisend } from '../utils/multisend'
import { SafeTransaction } from '../types'
import { useNavigate } from 'react-router-dom'

export function Deploy() {
  const { colorMode } = useColorMode()
  const currentSafe = useStore((s) => s.currentSafe)

  const prepareDeployOnchainStore = usePrepareSendTransaction(
    onchainStore.deployTxn
  )
  const deployOnchainStore = useSendTransaction({
    ...prepareDeployOnchainStore.config,
    onSuccess: () => {
      console.log('on success')
      prepareDeployOnchainStore.refetch()
    },
  })

  const [gitUrl, setGitUrl] = useState('')
  const [gitFile, setGitFile] = useState('')
  const [gitBranch, setGitBranch] = useState('')
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('')

  const gitDir = gitFile.includes('/')
    ? gitFile.slice(gitFile.lastIndexOf('/'))[0]
    : ''

  const refsInfo = useGitRefsList(gitUrl)

  const navigate = useNavigate()

  if (refsInfo.refs && !gitBranch) {
    const headCommit = refsInfo.refs.find((r) => r.ref === 'HEAD')
    const headBranch = refsInfo.refs.find(
      (r) => r.oid === headCommit?.oid && r !== headCommit
    )

    if (headBranch) {
      setGitBranch(headBranch.ref)
    }
  }

  const gitDirList = useGitFilesList(gitUrl, gitBranch, gitDir)

  const cannonDefInfo = useLoadCannonDefinition(gitUrl, gitBranch, gitFile)

  // get previous deploy info git information
  const prevDeployHashQuery = useContractRead({
    abi: onchainStore.ABI,
    address: onchainStore.deployAddress,
    functionName: 'getWithAddress',
    args: [currentSafe.address, keccak256(stringToBytes(`${gitUrl}`))], // TODO: include preset here
  })

  const { patches } = useGitDiff(
    gitUrl,
    prevDeployHashQuery.isSuccess &&
      trim(prevDeployHashQuery.data as Hex) != '0x'
      ? toHex(trim(prevDeployHashQuery.data as Hex))
      : gitBranch,
    gitBranch,
    cannonDefInfo.filesList ? Array.from(cannonDefInfo.filesList) : []
  )

  // run the build and get the list of transactions we need to run
  const buildInfo = useCannonBuild(
    cannonDefInfo.def,
    partialDeployIpfs ? `@ipfs:${partialDeployIpfs}` : null
  )

  const multicallTxn: Partial<TransactionRequestBase> =
    buildInfo.buildQuery.data &&
    buildInfo.buildQuery.data.steps.indexOf(null) === -1
      ? makeMultisend(
          [
            {
              to: zeroAddress,
              data: encodePacked(['string'], ['']),
            } as Partial<TransactionRequestBase>,
          ].concat(
            buildInfo.buildQuery.data.steps.map(
              (s) => s.tx as unknown as Partial<TransactionRequestBase>
            )
          )
        )
      : { value: 0n }

  const stagedTxn = usePrepareSendTransaction({
    account: currentSafe.address,
    ...multicallTxn,
    value: BigInt(multicallTxn.value),
  })

  const stager = useTxnStager(
    stagedTxn.data
      ? {
          to: stagedTxn.data.to,
          value: stagedTxn.data.value.toString(),
          data: stagedTxn.data.data,
          gasPrice: stagedTxn.data?.gasPrice?.toString(),
          safeTxGas: stagedTxn.data?.gas?.toString(),
        }
      : {},
    {
      onSignComplete() {
        console.log('signing is complete, redirect')
        navigate('/')
      },
    }
  )

  const execTxn = useContractWrite(stager.executeTxnConfig)

  if (
    prepareDeployOnchainStore.isFetched &&
    !prepareDeployOnchainStore.isError
  ) {
    return (
      <Container maxW="100%" w="container.sm">
        <Text mb="8">
          If your protocol is managed using a GitOps repository (with
          cannonfiles on GitHub), you can use this tool to queue transactions
          that would be created by merging the branch you specify.
        </Text>
        <Box
          p="6"
          bg={colorMode === 'dark' ? 'blackAlpha.400' : 'blackAlpha.50'}
          borderRadius="12px"
        >
          <Text mb={4}>
            To use this tool, you need to deploy the on-chain store contract.
            This is a one time (per network) operation and will cost a small
            amount of gas.
          </Text>
          <Button w="100%" onClick={() => deployOnchainStore.sendTransaction()}>
            Deploy On-Chain Store Contract
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="100%" w="container.sm">
      <FormControl mb="4">
        <FormLabel>Git Repo URL</FormLabel>
        <HStack>
          <Input
            type="text"
            placeholder="https://github.com/myorg/myrepo"
            value={gitUrl}
            onChange={(evt) => setGitUrl(evt.target.value)}
          />
          <EditableAutocompleteInput
            editable
            color="black"
            placeholder="cannonfile.toml"
            items={(gitDirList.contents || []).map((d) => ({
              label: gitDir + d,
              secondary: '',
            }))}
            onFilterChange={(v) => setGitFile(v)}
            onChange={(v) => setGitFile(v)}
          />
        </HStack>
        <FormHelperText>
          Enter the GitHub URL for branch of the GitOps repository to deploy.
          You will able to execute the transactions you are permitted to and
          queue the rest.
        </FormHelperText>
      </FormControl>

      <FormControl mb="4">
        <FormLabel>Branch</FormLabel>
        <HStack>
          <Select
            value={gitBranch}
            onChange={(evt) => setGitBranch(evt.target.value)}
          >
            {(refsInfo.refs?.filter((r) => r.ref !== 'HEAD') || []).map((r) => (
              <option value={r.ref}>{r.ref}</option>
            ))}
          </Select>
        </HStack>
        <FormHelperText>
          If you don't want to deploy from the default branch. Cannon will
          automatically detect the previous release.
        </FormHelperText>
      </FormControl>

      {/* TODO: insert/load override settings here */}

      <FormControl mb="4">
        <FormLabel>Optional Partial Deploy</FormLabel>
        <Input
          type="text"
          value={partialDeployIpfs}
          onChange={
            (evt) =>
              setPartialDeployIpfs(
                evt.target.value.slice(evt.target.value.indexOf('Qm'))
              ) /** TODO: handle bafy hash or other hashes */
          }
        />
        <FormHelperText>
          If the deployment you are executing required executing some
          transactions outside the safe (ex. contract deployments, transactions
          requiring permission of EOA), please supply the IPFS hash here.
        </FormHelperText>
      </FormControl>

      <Box mb="6">
        {patches.map((p) => {
          try {
            const { oldRevision, newRevision, type, hunks } = parseDiff(p)[0]
            return (
              <Diff
                key={oldRevision + '-' + newRevision}
                viewType="split"
                diffType={type}
                hunks={hunks}
              />
            )
          } catch (err) {
            console.error('diff didnt work:', err)

            return []
          }

        })}
      </Box>

      {buildInfo.buildQuery.isFetching && (
        <Box mb="6">{buildInfo.buildStatus}</Box>
      )}

      {buildInfo.buildQuery.isError && (
        <Box mb="6">{buildInfo.buildQuery.error.toString() as string}</Box>
      )}

      <Box mb="6">
        <HStack>
          <Button
            w="100%"
            isDisabled={!stagedTxn || !stager.canSign}
            onClick={() => stager.sign()}
          >
            Sign
          </Button>
          <Button
            w="100%"
            isDisabled={!stagedTxn || !stager.canExecute}
            onClick={() => execTxn.write()}
          >
            Execute
          </Button>
        </HStack>
        {stagedTxn.isError && (
          <Text>Transaction Error: {stagedTxn.error.message}</Text>
        )}
      </Box>
    </Container>
  )
}
