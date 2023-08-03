import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Select,
  Spinner,
  Text,
  Tooltip,
  useColorMode,
} from '@chakra-ui/react'
import { ChainBuilderContext } from '@usecannon/builder'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  TransactionRequestBase,
  zeroAddress,
} from 'viem'
import {
  useChainId,
  useContractWrite,
  usePrepareSendTransaction,
  useSendTransaction,
} from 'wagmi'
import { EditableAutocompleteInput } from '../components/EditableAutocompleteInput'
import NoncePicker from '../components/NoncePicker'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { useTxnStager } from '../hooks/backend'
import {
  useCannonBuild,
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useLoadCannonDefinition,
} from '../hooks/cannon'
import { useGitFilesList, useGitRefsList } from '../hooks/git'
import { useGetPreviousGitInfoQuery } from '../hooks/safe'
import { useStore } from '../store'
import { makeMultisend } from '../utils/multisend'
import * as onchainStore from '../utils/onchain-store'
import 'react-diff-view/style/index.css'

export function Deploy() {
  const { colorMode } = useColorMode()
  const currentSafe = useStore((s) => s.currentSafe)

  const prepareDeployOnchainStore = usePrepareSendTransaction(
    onchainStore.deployTxn
  )
  const deployOnChainStore = useSendTransaction({
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
  const [pickedNonce, setPickedNonce] = useState<number | null>(null)

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

  // TODO: is there any way to make a better ocntext? maybe this means we should get rid of name using context?
  const ctx: ChainBuilderContext = {
    chainId: 0,

    package: {},

    timestamp: '0',

    settings: {},

    contracts: {},

    txns: {},

    imports: {},

    extras: {},
  }

  const settings = useStore((s) => s.settings)
  const chainId = useChainId()

  const cannonPkgLatestInfo = useCannonPackage(
    cannonDefInfo.def && `${cannonDefInfo.def.getName(ctx)}:latest`,
    `${chainId}-${settings.preset}`
  )
  const cannonPkgVersionInfo = useCannonPackage(
    cannonDefInfo.def &&
      `${cannonDefInfo.def.getName(ctx)}:${cannonDefInfo.def.getVersion(ctx)}`,
    `${chainId}-${settings.preset}`
  )

  const prevDeployLocation =
    (partialDeployIpfs ? 'ipfs://' + partialDeployIpfs : null) ||
    cannonPkgLatestInfo.pkgUrl ||
    cannonPkgVersionInfo.pkgUrl

  const prevCannonDeployInfo = useCannonPackage(
    prevDeployLocation ? `@ipfs:${_.last(prevDeployLocation.split('/'))}` : null
  )

  // run the build and get the list of transactions we need to run
  const buildInfo = useCannonBuild(
    currentSafe,
    cannonDefInfo.def,
    prevCannonDeployInfo.pkg,
    false
  )

  const buildTransactions = () => {
    buildInfo.doBuild()
  }

  const uploadToPublishIpfs = useCannonWriteDeployToIpfs(
    buildInfo.buildResult?.runtime,
    {
      def: cannonDefInfo.def?.toJson(),
      state: buildInfo.buildResult?.state,
      options: prevCannonDeployInfo.pkg?.options,
      meta: prevCannonDeployInfo.pkg?.meta,
      miscUrl: prevCannonDeployInfo.pkg?.miscUrl,
    },
    prevCannonDeployInfo.metaUrl
  )

  useEffect(() => {
    if (buildInfo.buildResult) {
      uploadToPublishIpfs.writeToIpfsMutation.mutate()
    }
  }, [buildInfo.buildResult?.steps])

  const gitHash = refsInfo.refs?.find((r) => r.ref === gitBranch)?.oid

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe,
    gitUrl + ':' + gitFile
  )

  console.log(' the prev info query data is', prevInfoQuery.data)

  const multicallTxn: /*Partial<TransactionRequestBase>*/ any =
    buildInfo.buildResult && buildInfo.buildResult.steps.indexOf(null) === -1
      ? makeMultisend(
          [
            // supply the hint data
            {
              to: zeroAddress,
              data: encodeAbiParameters(
                [{ type: 'string[]' }],
                [
                  [
                    'deploy',
                    uploadToPublishIpfs.deployedIpfsHash,
                    prevDeployLocation || '',
                    `${gitUrl}:${gitFile}`,
                    gitHash,
                    prevInfoQuery.data &&
                    prevInfoQuery.data[0].result?.length > 2
                      ? (prevInfoQuery.data[0].result.slice(2) as any)
                      : '',
                  ],
                ]
              ),
            } as Partial<TransactionRequestBase>,
            // write data needed for the subsequent deployment to chain
            {
              to: onchainStore.deployAddress,
              data: encodeFunctionData({
                abi: onchainStore.ABI,
                functionName: 'set',
                args: [
                  keccak256(toBytes(`${gitUrl}:${gitFile}gitHash`)),
                  '0x' + gitHash,
                ],
              }),
            } as Partial<TransactionRequestBase>,
            {
              to: onchainStore.deployAddress,
              data: encodeFunctionData({
                abi: onchainStore.ABI,
                functionName: 'set',
                args: [
                  keccak256(toBytes(`${gitUrl}:${gitFile}cannonPackage`)),
                  stringToHex(uploadToPublishIpfs.deployedIpfsHash),
                ],
              }),
            } as Partial<TransactionRequestBase>,
          ].concat(
            buildInfo.buildResult.steps.map(
              (s) => s.tx as unknown as Partial<TransactionRequestBase>
            )
          )
        )
      : { value: 0n }

  let totalGas = 0n

  for (const step of buildInfo.buildResult?.steps || []) {
    totalGas += BigInt(step.gas.toString())
  }

  const stager = useTxnStager(
    multicallTxn.data
      ? {
          to: multicallTxn.to,
          value: multicallTxn.value.toString(),
          data: multicallTxn.data,
          safeTxGas: totalGas.toString(),
          operation: '1', // delegate call multicall
          _nonce: pickedNonce,
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
      <Container maxWidth="container.md">
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
          <Button w="100%" onClick={() => deployOnChainStore.sendTransaction()}>
            Deploy On-Chain Store Contract
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="container.md" pb="12">
      <FormControl mb="8">
        <FormLabel>GitOps Repository</FormLabel>
        <HStack>
          <Input
            type="text"
            placeholder="https://github.com/myorg/myrepo"
            value={gitUrl}
            onChange={(evt) => setGitUrl(evt.target.value)}
          />
          <Flex height="40px">
            {gitDirList.readdirQuery.isLoading ? (
              <Spinner my="auto" ml="2" />
            ) : (
              <EditableAutocompleteInput
                editable
                color={colorMode === 'dark' ? 'white' : 'black'}
                placeholder="cannonfile.toml"
                items={(gitDirList.contents || []).map((d) => ({
                  label: gitDir + d,
                  secondary: '',
                }))}
                onFilterChange={(v) => setGitFile(v)}
                onChange={(v) => setGitFile(v)}
              />
            )}
          </Flex>
        </HStack>
        <FormHelperText>
          Enter a Git URL and then select the Cannonfile that was modified in
          the branch chosen below.
        </FormHelperText>
      </FormControl>
      <FormControl mb="8">
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
      </FormControl>
      {/* TODO: insert/load override settings here */}
      <FormControl mb="8">
        <FormLabel>Partial Deployment Data (Optional)</FormLabel>
        <Input
          placeholder="Qm..."
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
          If this deployment requires transactions executed in other contexts
          (e.g. contract deployments or function calls using other signers),
          provide the IPFS hash generated from executing that partial deployment
          using the build command in the CLI.
        </FormHelperText>
      </FormControl>
      {buildInfo.buildStatus == '' && (
        <Button
          width="100%"
          mb={6}
          isDisabled={
            cannonPkgVersionInfo.ipfsQuery.isFetching ||
            cannonPkgLatestInfo.ipfsQuery.isFetching ||
            cannonPkgVersionInfo.registryQuery.isFetching ||
            cannonPkgLatestInfo.registryQuery.isFetching
          }
          onClick={() => buildTransactions()}
        >
          Preview Transactions to Queue
        </Button>
      )}
      {buildInfo.buildStatus && (
        <Alert mb="6" status="info">
          <Spinner mr={3} boxSize={4} />
          <strong>{buildInfo.buildStatus}</strong>
        </Alert>
      )}
      {buildInfo.buildError && (
        <Alert mb="6" status="error">
          <AlertIcon mr={3} />
          <strong>{buildInfo.buildError}</strong>
        </Alert>
      )}
      {multicallTxn.data && stager.safeTxn && (
        <TransactionDisplay safe={currentSafe} safeTxn={stager.safeTxn} />
      )}

      {uploadToPublishIpfs.deployedIpfsHash && multicallTxn.data && (
        <Box my="6">
          <NoncePicker safe={currentSafe} onPickedNonce={setPickedNonce} />
          <HStack gap="6">
            {!!stager.execConditionFailed ? (
              <Tooltip label={stager.signConditionFailed}>
                <Button
                  isDisabled={!!stager.signConditionFailed}
                  size="lg"
                  w="100%"
                  onClick={() => stager.sign()}
                >
                  Queue &amp; Sign
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip label={stager.execConditionFailed}>
              <Button
                isDisabled={!!stager.execConditionFailed}
                size="lg"
                w="100%"
                onClick={() => execTxn.write()}
              >
                Execute
              </Button>
            </Tooltip>
          </HStack>
        </Box>
      )}
    </Container>
  )
}
