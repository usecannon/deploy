import React, { useEffect } from 'react'

import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'
import { IPFSLoader, OnChainRegistry } from '@usecannon/builder'
import { ethers } from 'ethers'

// TODO: move to dynamic
const IPFS_URL = 'https://25JrnDgeR88vTvaEDhPEP2vDtOJ:0c838ff3c2d833f72dfc6c4e2ef6fda8@ipfs.infura.io:5001'
const registryProviderUrl = 'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7'
const registryAddress = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba'

// has one text box and one button
const Cannon = (): React.ReactElement => {
  const { safe } = useSafeAppsSDK()

  // react-query
  useEffect(() => {
    const getDeploy = async () => {
      const registry = new OnChainRegistry({
        signerOrProvider: new ethers.providers.JsonRpcProvider(registryProviderUrl),
        address: registryAddress,
      })
      const loader = new IPFSLoader(IPFS_URL, registry)
      try {
        const deployInfo = await loader.readDeploy('@synthetix', '3.0.0-alpha.9', safe.chainId)
        console.log('deployInfo: ', deployInfo)
      } catch (e) {
        console.error(e)
      }
    }

    getDeploy()
  }, [safe.chainId])
  return <div>test</div>
}

export default Cannon
