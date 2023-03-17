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
      allowPartialDeploy: false,
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

  const initialCtx = await createInitialContext(
    def,
    incompleteDeploy.meta,
    incompleteDeploy.options
  )

  const newState = await cannonBuild(
    runtime,
    def,
    incompleteDeploy.state ?? {},
    initialCtx
  )

  const executedTxs = executedSteps.map((s) => Object.values(s.txns)).flat()

  return { newState, executedTxs }
}
