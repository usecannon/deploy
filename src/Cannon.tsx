import React, { useEffect } from 'react'

// import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'
import { IPFSLoader, OnChainRegistry } from '@usecannon/builder'

// TODO: move to dynamic
const IPFS_URL = 'https://usecannon.infura-ipfs.io'
const registryProviderUrl = 'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7'
const registryAddress = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba'

// has one text box and one button
const Cannon = (): React.ReactElement => {
  // const { safe } = useSafeAppsSDK()
  // const { chainId } = safe

  const chainId = 13370
  const preset = 'main'
  const packageName = 'synthetix:latest'

  useEffect(() => {
    const getDeploy = async () => {
      const registry = new OnChainRegistry({
        signerOrProvider: registryProviderUrl,
        address: registryAddress,
      })

      const loader = new IPFSLoader(IPFS_URL, registry)

      try {
        const deployInfo = await loader.readDeploy(packageName, preset, chainId)

        if (!deployInfo) {
          throw new Error(`Package not found: ${packageName} (${chainId}-${preset})`)
        }

        console.log('deployInfo: ', deployInfo)
      } catch (e) {
        console.error(e)
      }
    }

    getDeploy()
  }, [chainId])

  return <div>test</div>
}

export default Cannon
