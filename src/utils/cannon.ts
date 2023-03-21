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

export async function build({
  chainId,
  provider,
  incompleteDeploy,
  loader,
}: {
  chainId: number
  provider: CannonWrapperGenericProvider
  incompleteDeploy: DeploymentInfo
  loader: IPFSLoader
}) {
  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId,
      getSigner: async (addr: string) => provider.getSigner(addr),
      baseDir: null,
      snapshots: false,
      allowPartialDeploy: true,
      publicSourceCode: true,
    },
    loader
  )

  const executedSteps: ChainArtifacts[] = []

  runtime.on(
    Events.PostStepExecute,
    (stepType: string, stepLabel: string, stepOutput: ChainArtifacts) => {
      executedSteps.push(stepOutput)
    }
  )

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

  const executedTxs = executedSteps
    .map((s) => !!s && Object.values(s.txns))
    .filter((tx) => !!tx)
    .flat()

  const name = def.getName(ctx)
  const version = def.getVersion(ctx)

  return { name, version, runtime, def, newState, executedTxs }
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
