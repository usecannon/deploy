import _ from 'lodash'

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Tag,
  Text,
} from '@chakra-ui/react'
import {
  Hex,
  TransactionRequestBase,
  bytesToString,
  decodeAbiParameters,
  decodeFunctionData,
  hexToString,
  keccak256,
  stringToBytes,
  toHex,
  trim,
  zeroAddress,
} from 'viem'

import MulticallABI from '../../backend/src/abi/Multicall.json'
import { DisplayedTransaction } from './DisplayedTransaction'
import { SafeTransaction } from '../types'
import {
  useCannonBuild,
  useCannonPackage,
  useCannonPackageContracts,
  useLoadCannonDefinition,
} from '../hooks/cannon'
import { useContractRead, useContractReads } from 'wagmi'

import * as onchainStore from '../utils/onchain-store'
import { useStore } from '../store'
import { useGitDiff } from '../hooks/git'
import { Diff, parseDiff } from 'react-diff-view'
import { CheckIcon, WarningIcon } from '@chakra-ui/icons'

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction
  safeAddress: string
  verify?: boolean
}) {
  const currentSafe = useStore((s) => s.currentSafe)
  // see waht we can parse out of the data
  let decoded: { args: readonly unknown[]; functionName: string } = {
    args: [],
    functionName: '',
  }
  try {
    decoded = decodeFunctionData({
      abi: MulticallABI,
      data: props.safeTxn.data as Hex,
    })
  } catch (err) {
    console.log('didnt parse', err)
  }

  let hintType = ''
  let hintCannonPackage = ''
  let hintCannonUpgradeFromPackage = ''
  let hintGitRepoUrl = ''
  let hintGitRepoHash = ''
  if (
    (decoded.functionName === 'aggregate3' ||
      decoded.functionName === 'aggregate3Value') &&
    decoded.args[0][0].target === zeroAddress
  ) {
    ;[hintType, hintCannonPackage, hintCannonUpgradeFromPackage, hintGitRepoUrl, hintGitRepoHash] =
      decodeAbiParameters(
        [{ type: 'string[]' }],
        decoded.args[0][0].callData
      )[0]
  }

  console.log('got hint data', hintCannonPackage, decoded)

  const cannonInfo = useCannonPackageContracts(
    hintCannonPackage ? '@' + hintCannonPackage.replace('://', ':') : ''
  )

  console.log('cannon info', cannonInfo)

  // git stuff
  const denom = hintGitRepoUrl?.lastIndexOf(':')
  const gitUrl = hintGitRepoUrl?.slice(0, denom)
  const gitFile = hintGitRepoUrl?.slice(denom + 1)

  // get previous deploy info git information
  const prevDeployHashQuery = useContractReads({ contracts: [
    {
      abi: onchainStore.ABI as any,
      address: onchainStore.deployAddress,
      functionName: 'getWithAddress',
      args: [props.safeAddress, keccak256(stringToBytes((hintGitRepoUrl || '') + 'gitHash'))],
    },
    {
      abi: onchainStore.ABI as any,
      address: onchainStore.deployAddress,
      functionName: 'getWithAddress',
      args: [props.safeAddress, keccak256(stringToBytes((hintGitRepoUrl || '') + 'cannonPackage'))],
    },
  ] })

  const prevDeployGitHash: string =
    prevDeployHashQuery.data && prevDeployHashQuery.data[0].result?.length > 2
      ? prevDeployHashQuery.data[0].result.slice(2) as any
      : hintGitRepoHash

  const prevDeployPackageUrl = prevDeployHashQuery.data ? hexToString(prevDeployHashQuery.data[1].result as any) : ''
  
  console.log('got prev cannon hint', hintCannonUpgradeFromPackage)

  const prevCannonDeployInfo = useCannonPackage(
    hintCannonUpgradeFromPackage || prevDeployPackageUrl ? `@ipfs:${_.last((hintCannonUpgradeFromPackage || prevDeployPackageUrl).split('/'))}` : null
  )

  console.log('got prev cannon deploy info', prevDeployPackageUrl, prevCannonDeployInfo)

  const cannonDefInfo = useLoadCannonDefinition(
    gitUrl,
    hintGitRepoHash,
    gitFile
  )

  const { patches } = useGitDiff(
    gitUrl,
    prevDeployGitHash,
    hintGitRepoHash,
    cannonDefInfo.filesList ? Array.from(cannonDefInfo.filesList) : []
  )
  
  const buildInfo = useCannonBuild(
    cannonDefInfo.def, 
    prevCannonDeployInfo.pkg, 
    props.verify && (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched)
  )

  if (cannonInfo.contracts && decoded.args.length) {
    const txns = (decoded.args[0] as any[])
      .slice(hintType === 'deploy' ? 3 : 1)
      .map((txn) => ({ to: txn.target, data: txn.callData, value: txn.value }))

    // compare proposed build info with expected transaction batch
    const expectedTxns = buildInfo.buildResult?.steps?.map(
      (s) => s.tx as unknown as Partial<TransactionRequestBase>
    );

    console.log('txns', txns, 'expected', expectedTxns)

    const unequalTransaction = expectedTxns && txns.find((t, i) => {
      return t.to.toLowerCase() !== expectedTxns[i].to.toLowerCase() ||
          t.data !== expectedTxns[i].data || 
          t.value.toString() !== expectedTxns[i].value.toString()
    })

    return (
      <Box maxW="100%">
        <FormControl mb="3">
          <FormLabel mb="0.5">Base Cannon Package</FormLabel>
          <Input variant="unstyled" isReadOnly value={hintCannonPackage} />
        </FormControl>

        <FormControl mb="3">
          <FormLabel mb="0.5">Git Target</FormLabel>
          <Input
            variant="unstyled"
            isReadOnly
            value={
              hintGitRepoUrl ? hintGitRepoUrl + '@' + hintGitRepoHash : 'N/A'
            }
          />
        </FormControl>

        <FormControl mb="4">
          <FormLabel mb="1">Transaction Type</FormLabel>
          <Tag textTransform="uppercase" size="md">
            {hintType}
          </Tag>
        </FormControl>

        <FormLabel mb="1">Git Diff</FormLabel>
        <Box mb="6" bg="gray.900" borderRadius="md">
          {patches.map((p) => {
            try {
              console.log('parse the patch', p)
              console.log('got parsed diff', parseDiff(p))
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
        <Heading size="md">Transactions</Heading>
        {txns.map((txn, i) => (
          <DisplayedTransaction contracts={cannonInfo.contracts} txn={txn} />
        ))}
        {props.verify &&
          <Box>
            <Heading size="md">Verification</Heading>
            {buildInfo.buildStatus && <Text>{buildInfo.buildStatus}</Text>}
            {buildInfo.buildError && <Text color='red'><WarningIcon />Proposed Changes have error: {}</Text>}
            {buildInfo.buildResult && !unequalTransaction && <Text color='green'><CheckIcon />&nbsp;Proposed Transactions Match Diff</Text>}
            {buildInfo.buildResult && unequalTransaction && <Text color='red' as='b'><WarningIcon />&nbsp;Proposed Transactions Do not Match Git Diff. Could be an attack.</Text>}
            {prevDeployPackageUrl && hintCannonUpgradeFromPackage !== prevDeployPackageUrl && <Text color='orange'><WarningIcon />&nbsp;Previous Deploy Hash does not derive from on-chain record</Text>}
          </Box>
        }
        
      </Box>
    )
  } else {
    return (
      <Alert status="info">
        <AlertIcon />
        Parsing transaction data...
      </Alert>
    )
  }

  // TODO: print raw
  return (
    <Container>
      <Text>Unable to parse data!</Text>
    </Container>
  )
}
