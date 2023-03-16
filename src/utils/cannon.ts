import {
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  DeploymentInfo,
  Events,
  IPFSLoader,
  TransactionMap,
  build,
  createInitialContext,
} from '@usecannon/builder'

export type CannonTransaction = TransactionMap[keyof TransactionMap]

export async function getPendingStepsTransactions({
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
      allowPartialDeploy: false,
      publicSourceCode: true,
    },
    loader
  )

  const pendingSteps: ChainArtifacts[] = []

  runtime.on(
    Events.PostStepExecute,
    (stepType: string, stepLabel: string, stepOutput: ChainArtifacts) => {
      pendingSteps.push(stepOutput)
    }
  )

  await runtime.restoreMisc(incompleteDeploy.miscUrl)
  const def = new ChainDefinition(incompleteDeploy.def)

  const initialCtx = await createInitialContext(
    def,
    incompleteDeploy.meta,
    incompleteDeploy.options
  )

  await build(runtime, def, incompleteDeploy.state ?? {}, initialCtx)

  const pendingTxs = pendingSteps.map((s) => Object.values(s.txns)).flat()

  return pendingTxs
}
