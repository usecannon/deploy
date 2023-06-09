import { ChakraProvider, useColorModeValue } from '@chakra-ui/react'
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit'
import { WagmiConfig } from 'wagmi'
import { useEffect } from 'react'

import { Deploy } from './pages/Deploy'
import { Menu } from './components/Menu'
import { Transactions } from './pages/Transactions'
import { chains, wagmiConfig } from './wallet'
import { useStore } from './store'

export function App() {
  const page = useStore((s) => s.page)

  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <ChakraProvider>
      <WalletProvider>
        <Menu />
        {page === 'deploy' && <Deploy />}
        {page === 'transactions' && <Transactions />}
      </WalletProvider>
    </ChakraProvider>
  )
}

function WalletProvider({ children }: { children: React.ReactNode }) {
  const walletTheme = useColorModeValue(lightTheme(), darkTheme())

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} theme={walletTheme}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
