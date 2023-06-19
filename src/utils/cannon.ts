import _ from 'lodash'
import CannonRegistryAbi from '@usecannon/builder/dist/abis/CannonRegistry'
import {
  CANNON_CHAIN_ID,
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderRuntime,
  ChainDefinition,
  DeploymentInfo,
  Events,
  IPFSLoader,
  RawChainDefinition,
  TransactionMap,
  build as cannonBuild,
  createInitialContext,
} from '@usecannon/builder'
import { ethers } from 'ethers'
import toml from '@iarna/toml'

import * as git from './git'
import path from '@isomorphic-git/lightning-fs/src/path'

export type CannonTransaction = TransactionMap[keyof TransactionMap]

export interface StepExecutionError {
  name: string
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
      snapshots: false,
      allowPartialDeploy: true,
      publicSourceCode: true,
    },
    null,
    { ipfs: loader }
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
    skippedSteps.push({ name: stepName, err })
  })

  await runtime.restoreMisc(incompleteDeploy.miscUrl)
  const def = new ChainDefinition(incompleteDeploy.def)

  const ctx = await createInitialContext(
    def,
    incompleteDeploy.meta,
    chainId,
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

export function validatePreset(preset: string) {
  return /^[a-z]+$/.test(preset)
}

export async function loadCannonfile(repo: string, ref: string, filepath: string) {
  const filesList = new Set<string>();
  const [rawDef, buf] = await loadChainDefinitionToml(repo, ref, filepath, [], filesList);
  const def = new ChainDefinition(rawDef as RawChainDefinition);
  //const pkg = loadPackageJson(path.join(path.dirname(filepath), 'package.json'));

  const ctx: ChainBuilderContext = {
    package: {},
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: '0',

    contracts: {},
    txns: {},
    imports: {},
    extras: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);

  return { def, name, version, cannonfile: buf.toString(), filesList };
}

async function loadChainDefinitionToml(repo: string, ref: string, filepath: string, trace: string[], files: Set<string>): Promise<[Partial<RawChainDefinition>, string]> {
  let buf: string;
  try {
    buf = await git.readFile(repo, ref, filepath);
  } catch (err) {
    throw new Error(`problem while reading artifact (trace): ${trace.join(', ')}: ${err.toString()}`)
  }

  let rawDef: Partial<RawChainDefinition> & { include?: string[] };
  try {
    rawDef = toml.parse(buf);
  } catch (err: any) {
    throw new Error(`error encountered while parsing toml file ${filepath}: ${err.toString()}`);
  }

  const assembledDef: Partial<RawChainDefinition> = {};

  // we only want to "override" new steps with old steps. So, if we get 2 levels deep, that means we are parsing
  // a step contents, and we should just take the srcValue
  const customMerge = (_objValue: any, srcValue: any, _key: string, _object: string, _source: any, stack: any) => {
    if (stack.size === 2) {
      // cut off merge for any deeper than this
      return srcValue;
    }
  };

  for (const additionalFilepath of rawDef.include || []) {
    const abspath = path.join(path.dirname(filepath), additionalFilepath);

    _.mergeWith(assembledDef, (await loadChainDefinitionToml(repo, ref, abspath, [filepath].concat(trace), files))[0], customMerge);
  }

  _.mergeWith(assembledDef, _.omit(rawDef, 'include'), customMerge);

  return [assembledDef, buf];
}