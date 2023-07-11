import _ from 'lodash'
import {
  Alert,
  AlertIcon,
  Box,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Tag,
  Text,
} from '@chakra-ui/react'
import { ArrowForwardIcon, CheckIcon, WarningIcon } from '@chakra-ui/icons'
import { Diff, parseDiff } from 'react-diff-view'
import { Link } from 'react-router-dom'
import {
  TransactionRequestBase,
  hexToString,
  keccak256,
  stringToBytes,
} from 'viem'
import { useContractReads } from 'wagmi'

import * as onchainStore from '../utils/onchain-store'
import { DisplayedTransaction } from './DisplayedTransaction'
import { SafeDefinition, useStore } from '../store'
import { SafeTransaction } from '../types'
import { createSimulationData } from '../utils/safe'
import { parseHintedMulticall } from '../utils/cannon'
import {
  useCannonBuild,
  useCannonPackage,
  useCannonPackageContracts,
  useLoadCannonDefinition,
} from '../hooks/cannon'
import { useGitDiff } from '../hooks/git'
import { useTxnStager } from '../hooks/backend'
import PublishUtility from './PublishUtility'

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction
  safe: SafeDefinition
  verify?: boolean
}) {
  const settings = useStore((s) => s.settings)
  const hintData = parseHintedMulticall(props.safeTxn?.data)

  // TODO: print raw
  if (!hintData) {
    return <Alert status="info">Could not parse the transaction.</Alert>
  }

  const cannonInfo = useCannonPackageContracts(
    hintData.cannonPackage
      ? '@' + hintData.cannonPackage.replace('://', ':')
      : ''
  )

  // git stuff
  const denom = hintData.gitRepoUrl?.lastIndexOf(':')
  const gitUrl = hintData.gitRepoUrl?.slice(0, denom)
  const gitFile = hintData.gitRepoUrl?.slice(denom + 1)

  // get previous deploy info git information
  const prevDeployHashQuery = useContractReads({
    contracts: [
      {
        abi: onchainStore.ABI as any,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [
          props.safe.address,
          keccak256(stringToBytes((hintData.gitRepoUrl || '') + 'gitHash')),
        ],
      },
      {
        abi: onchainStore.ABI as any,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [
          props.safe.address,
          keccak256(
            stringToBytes((hintData.gitRepoUrl || '') + 'cannonPackage')
          ),
        ],
      },
    ],
  })

  const prevDeployGitHash: string =
    prevDeployHashQuery.data && prevDeployHashQuery.data[0].result?.length > 2
      ? (prevDeployHashQuery.data[0].result.slice(2) as any)
      : hintData.gitRepoHash

  const prevDeployPackageUrl = prevDeployHashQuery.data
    ? hexToString(prevDeployHashQuery.data[1].result || ('' as any))
    : ''

  console.log('got prev cannon hint', hintData.cannonUpgradeFromPackage)

  const prevCannonDeployInfo = useCannonPackage(
    hintData.cannonUpgradeFromPackage || prevDeployPackageUrl
      ? `@ipfs:${_.last(
          (hintData.cannonUpgradeFromPackage || prevDeployPackageUrl).split('/')
        )}`
      : null
  )

  console.log(
    'got prev cannon deploy info',
    prevDeployPackageUrl,
    prevCannonDeployInfo
  )

  const cannonDefInfo = useLoadCannonDefinition(
    gitUrl,
    hintData.gitRepoHash,
    gitFile
  )

  const { patches } = useGitDiff(
    gitUrl,
    prevDeployGitHash,
    hintData.gitRepoHash,
    cannonDefInfo.filesList ? Array.from(cannonDefInfo.filesList) : []
  )

  const buildInfo = useCannonBuild(
    props.safe,
    cannonDefInfo.def,
    prevCannonDeployInfo.pkg,
    props.verify &&
      (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched)
  )

  const stager = useTxnStager(props.safeTxn, { safe: props.safe })

  if (cannonInfo.contracts) {
    // compare proposed build info with expected transaction batch
    const expectedTxns = buildInfo.buildResult?.steps?.map(
      (s) => s.tx as unknown as Partial<TransactionRequestBase>
    )

    console.log(
      'txns',
      hintData.txns,
      'expected',
      expectedTxns,
      'skipped',
      buildInfo.buildResult?.skippedSteps
    )

    const unequalTransaction =
      expectedTxns &&
      (hintData.txns.length !== expectedTxns.length ||
        hintData.txns.find((t, i) => {
          return (
            t.to.toLowerCase() !== expectedTxns[i].to.toLowerCase() ||
            t.data !== expectedTxns[i].data ||
            t.value.toString() !== expectedTxns[i].value.toString()
          )
        }))

    return (
      <Box maxW="100%">
        <FormControl mb="3">
          <FormLabel mb="0.5">Base Cannon Package</FormLabel>
          <Input variant="unstyled" isReadOnly value={hintData.cannonPackage} />
        </FormControl>

        <FormControl mb="3">
          <FormLabel mb="0.5">Git Target</FormLabel>
          <Input
            variant="unstyled"
            isReadOnly
            value={
              hintData.gitRepoUrl
                ? hintData.gitRepoUrl + '@' + hintData.gitRepoHash
                : 'N/A'
            }
          />
        </FormControl>

        <FormControl mb="4">
          <FormLabel mb="1">Transaction Type</FormLabel>
          <Tag textTransform="uppercase" size="md">
            <Text as="b">{hintData.type}</Text>
          </Tag>
        </FormControl>

        <FormLabel mb="1">Git Diff</FormLabel>
        <Box mb="6" bg="gray.900" borderRadius="md">
          {patches.map((p) => {
            if (!p) {
              return []
            }

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
        <Box>
          <Heading size="md">Transactions</Heading>
          {hintData.txns.map((txn, i) => (
            <DisplayedTransaction contracts={cannonInfo.contracts} txn={txn} />
          ))}
          <Link
            to={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
              props.safe.address
            }&gas=${8000000}&gasPrice=0&value=${
              props.safeTxn?.value
            }&contractAddress=${
              props.safe?.address
            }&rawFunctionInput=${createSimulationData(props.safeTxn)}&network=${
              props.safe.chainId
            }&headerBlockNumber=&headerTimestamp=`}
          >
            Simulate on Tenderly <ArrowForwardIcon />
          </Link>
        </Box>
        {props.verify && hintData.type === 'deploy' && (
          <Box>
            <Heading size="md">Verification</Heading>
            {buildInfo.buildStatus && <Text>{buildInfo.buildStatus}</Text>}
            {buildInfo.buildError && (
              <Text color="red">
                <WarningIcon />
                Proposed Changes have error: {buildInfo.buildError}
              </Text>
            )}
            {buildInfo.buildResult && !unequalTransaction && (
              <Text color="green">
                <CheckIcon />
                &nbsp;Proposed Transactions Match Diff
              </Text>
            )}
            {buildInfo.buildResult && unequalTransaction && (
              <Text color="red" as="b">
                <WarningIcon />
                &nbsp;Proposed Transactions Do not Match Git Diff. Could be an
                attack.
              </Text>
            )}
            {prevDeployPackageUrl &&
              hintData.cannonUpgradeFromPackage !== prevDeployPackageUrl && (
                <Text color="orange">
                  <WarningIcon />
                  &nbsp;Previous Deploy Hash does not derive from on-chain
                  record
                </Text>
              )}
          </Box>
        )}
        {props.verify ? (
          <Box>
            <Heading size="md">Signing Status</Heading>
            <Text as="b">
              {stager.existingSigners.length} / {Number(stager.requiredSigners)}
            </Text>
            <ul>
              {stager.existingSigners.map((s) => (
                <li>{s}</li>
              ))}
            </ul>
          </Box>
        ) : (
          <Box>
            <Heading size="md">Deployment Publish Status</Heading>
            <PublishUtility
              deployUrl={hintData.cannonPackage}
              targetVariant={`${props.safe.chainId}-${settings.preset}`}
            />
          </Box>
        )}
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
}
