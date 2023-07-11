import _ from 'lodash'
import { Alert, AlertIcon, Box, Button, Heading, Text } from '@chakra-ui/react'
import { CheckIcon, ExternalLinkIcon, WarningIcon } from '@chakra-ui/icons'
import { Diff, parseDiff } from 'react-diff-view'
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

  const prevCannonDeployInfo = useCannonPackage(
    hintData.cannonUpgradeFromPackage || prevDeployPackageUrl
      ? `@ipfs:${_.last(
          (hintData.cannonUpgradeFromPackage || prevDeployPackageUrl).split('/')
        )}`
      : null
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
      <Box>
        {hintData.gitRepoUrl && (
          <Text mb="2" opacity={0.9}>
            <strong>Git Target:</strong> {hintData.gitRepoUrl}@
            {hintData.gitRepoHash}
          </Text>
        )}

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
        <Box mb="6">
          <Heading size="md" mb="1">
            Transactions
          </Heading>
          <Box maxW="100%" overflowX="scroll">
            {hintData.txns.map((txn, i) => (
              <DisplayedTransaction
                contracts={cannonInfo.contracts}
                txn={txn}
              />
            ))}
          </Box>
          {props.verify && (
            <Button
              size="xs"
              as="a"
              mt={2}
              href={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
                props.safe.address
              }&gas=${8000000}&gasPrice=0&value=${
                props.safeTxn?.value
              }&contractAddress=${
                props.safe?.address
              }&rawFunctionInput=${createSimulationData(
                props.safeTxn
              )}&network=${
                props.safe.chainId
              }&headerBlockNumber=&headerTimestamp=`}
              colorScheme="purple"
              rightIcon={<ExternalLinkIcon />}
              target="_blank"
              rel="noopener noreferrer"
            >
              Simulate on Tenderly
            </Button>
          )}
        </Box>
        {props.verify && hintData.type === 'deploy' && (
          <Box mb="6">
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
            <Heading size="md" mb="3">
              Signatures
            </Heading>
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
            <Heading size="md" mb="3">
              Cannon Package
            </Heading>
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
