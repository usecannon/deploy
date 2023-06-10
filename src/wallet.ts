import { configureChains, createConfig } from 'wagmi'
import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { goerli, mainnet, optimism, polygon } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'

const { chains, publicClient } = configureChains(
  [mainnet, optimism, polygon, goerli],
  [publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: 'Cannon Deploy',
  projectId: 'f12a3d8e2d2194a62dd6b349a474cc85',
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

export { wagmiConfig, chains }
