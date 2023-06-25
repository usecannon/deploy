import { QueryClient } from '@tanstack/react-query'
import { configureChains, createConfig, sepolia } from 'wagmi'
import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import {
  goerli,
  mainnet,
  optimism,
  polygon,
  optimismGoerli,
} from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'

export const supportedChains = [
  mainnet,
  optimism,
  polygon,
  goerli,
  optimismGoerli,
  sepolia
]

const { chains, publicClient } = configureChains(supportedChains, [
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
