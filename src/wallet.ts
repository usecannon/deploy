import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { QueryClient } from '@tanstack/react-query'
import { configureChains, createConfig, sepolia } from 'wagmi'

import * as allChains from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import _ from 'lodash'

import { infuraProvider } from 'wagmi/providers/infura'

//console.log(Object.keys(allChains))

export const supportedChains = Object.values(allChains)

const { chains, publicClient } = configureChains(supportedChains, [
  infuraProvider({ apiKey: '6b369abb43f44b83a7fb34f6eacb8683' }),
  publicProvider(),
])

const { connectors } = getDefaultWallets({
  appName: 'Cannon Deploy',
  projectId: 'f12a3d8e2d2194a62dd6b349a474cc85',
  chains,
})

const wagmiConfig = createConfig({
  queryClient: new QueryClient({
    defaultOptions: {
      queries: {
        cacheTime: 1e3 * 60 * 60 * 24,
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: false,
        retry: 0,
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
    },
  }),
  autoConnect: true,
  connectors,
  publicClient,
})

export { wagmiConfig, chains }
