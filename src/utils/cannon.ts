import CannonRegistryAbi from '@usecannon/builder/dist/abis/CannonRegistry'
import {
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  DeploymentInfo,
  Events,
  IPFSLoader,
  TransactionMap,
  build as cannonBuild,
  createInitialContext,
} from '@usecannon/builder'
import { ethers } from 'ethers'

export type CannonTransaction = TransactionMap[keyof TransactionMap]

export interface StepExecutionError {
  stepName: string
  err: Error
}

export async function build({
  chainId,
  provider,
  defaultSignerAddress,
  incompleteDeploy,
  loader,
}: {
  chainId: number
  provider: CannonWrapperGenericProvider
  defaultSignerAddress: string
  incompleteDeploy: DeploymentInfo
  loader: IPFSLoader
}) {
  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId,
      getSigner: async (addr: string) => provider.getSigner(addr),
      getDefaultSigner: async () => provider.getSigner(defaultSignerAddress),
      baseDir: null,
      snapshots: false,
      allowPartialDeploy: true,
      publicSourceCode: true,
    },
    loader
  )

  const simulatedSteps: ChainArtifacts[] = []
  const skippedSteps: StepExecutionError[] = []

  runtime.on(
    Events.PostStepExecute,
    (stepType: string, stepLabel: string, stepOutput: ChainArtifacts) => {
      simulatedSteps.push(stepOutput)
    }
  )

  runtime.on(Events.SkipDeploy, (stepName: string, err: Error) => {
    console.log(stepName, err)
    skippedSteps.push({ stepName, err })
  })

  await runtime.restoreMisc(incompleteDeploy.miscUrl)
  const def = new ChainDefinition(incompleteDeploy.def)

  const ctx = await createInitialContext(
    def,
    incompleteDeploy.meta,
    incompleteDeploy.options
  )

  const newState = await cannonBuild(
    runtime,
    def,
    incompleteDeploy.state ?? {},
    ctx
  )

  const simulatedTxs = simulatedSteps
    .map((s) => !!s?.txns && Object.values(s.txns))
    .filter((tx) => !!tx)
    .flat()

  const name = def.getName(ctx)
  const version = def.getVersion(ctx)

  return { name, version, runtime, def, newState, simulatedTxs, skippedSteps }
}

interface PublishParams {
  packageName: string
  variant: string
  packageTags: string[]
  packageVersionUrl: string
  packageMetaUrl: string
}

export function createPublishData({
  packageName,
  variant,
  packageTags,
  packageVersionUrl,
  packageMetaUrl,
}: PublishParams) {
  const ICannonRegistry = new ethers.utils.Interface(CannonRegistryAbi)
  return ICannonRegistry.encodeFunctionData('publish', [
    ethers.utils.formatBytes32String(packageName),
    ethers.utils.formatBytes32String(variant),
    packageTags.map((p) => ethers.utils.formatBytes32String(p)),
    packageVersionUrl,
    packageMetaUrl,
  ])
}
