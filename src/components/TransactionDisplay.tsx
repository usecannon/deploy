import _ from 'lodash'
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  ListItem,
  OrderedList,
  Text,
} from '@chakra-ui/react'
import { CheckIcon, ExternalLinkIcon, WarningIcon } from '@chakra-ui/icons'
import { Diff, parseDiff } from 'react-diff-view'
import { TransactionRequestBase, hexToString } from 'viem'

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
import { useGetPreviousGitInfoQuery } from '../hooks/safe'

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction
  safe: SafeDefinition
  verify?: boolean
  allowPublishing?: boolean
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

  const prevDeployHashQuery = useGetPreviousGitInfoQuery(
    props.safe,
    hintData.gitRepoUrl
  )

  const prevDeployGitHash: string =
    prevDeployHashQuery.data && prevDeployHashQuery.data[0].result?.length > 2
      ? (prevDeployHashQuery.data[0].result.slice(2) as any)
      : hintData.gitRepoHash
  console.log('prevDeployGitHash', prevDeployGitHash)
  console.log('prevDeployHashQuery', prevDeployHashQuery)

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
      <Box>
        {hintData.gitRepoUrl && (
          <FormControl mb={3} opacity={0.9}>
            <FormLabel mb={0}>Git Target</FormLabel>
            {hintData.gitRepoUrl}@{hintData.gitRepoHash}
          </FormControl>
        )}

        <Box mb="6">
          {patches.map((p) => {
            if (!p) {
              return []
            }

            try {
              console.log('parse the patch', p)
              console.log('got parsed diff', parseDiff(p))
              const { oldRevision, newRevision, type, hunks } = parseDiff(p)[0]
              return (
                <Box bg="gray.900" borderRadius="md" fontSize="xs" mb={4}>
                  <Diff
                    key={oldRevision + '-' + newRevision}
                    viewType="split"
                    diffType={type}
                    hunks={hunks}
                  />
                </Box>
              )
            } catch (err) {
              console.error('diff didnt work:', err)

              return []
            }
          })}
        </Box>
        <Box mb="6">
          <Heading size="md">Transactions</Heading>
          <Box maxW="100%" overflowX="scroll">
            {hintData.txns.map((txn, i) => (
              <DisplayedTransaction
                contracts={cannonInfo.contracts}
                txn={txn}
              />
            ))}
          </Box>
        </Box>
        {props.verify && hintData.type === 'deploy' && (
          <Box mb="6">
            <Heading size="md" mb="2">
              Verify Queued Transactions
            </Heading>
            {buildInfo.buildStatus && <Text>{buildInfo.buildStatus}</Text>}
            {buildInfo.buildError && (
              <Text color="red">
                <WarningIcon />
                Proposed Changes have error: {buildInfo.buildError}
              </Text>
            )}
            {buildInfo.buildResult && !unequalTransaction && (
              <Box
                display="inline-block"
                borderRadius="lg"
                bg="blackAlpha.300"
                px={4}
                py={3}
              >
                <Box
                  backgroundColor="green"
                  borderRadius="full"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  boxSize={5}
                  mr={2.5}
                >
                  <CheckIcon color="white" boxSize={2.5} />
                </Box>
                <Text fontWeight="bold" display="inline">
                  The transactions queued to the Safe match the Git Target
                </Text>
              </Box>
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
        {props.verify && (
          <Button
            size="xs"
            as="a"
            mb={4}
            href={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
              props.safe.address
            }&gas=${8000000}&gasPrice=0&value=${
              props.safeTxn?.value
            }&contractAddress=${
              props.safe?.address
            }&rawFunctionInput=${createSimulationData(props.safeTxn)}&network=${
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
        {props.verify ? (
          <Box>
            <Heading size="md" mb="2">
              Signatures ({stager.existingSigners.length}/
              {Number(stager.requiredSigners)})
            </Heading>
            <OrderedList>
              {stager.existingSigners.map((s) => (
                <ListItem>{s}</ListItem>
              ))}
            </OrderedList>
          </Box>
        ) : (
          props.allowPublishing && (
            <Box>
              <Heading size="md" mb="1.5">
                Cannon Package
              </Heading>
              <PublishUtility
                deployUrl={hintData.cannonPackage}
                targetVariant={`${props.safe.chainId}-${settings.preset}`}
              />
            </Box>
          )
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
