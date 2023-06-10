import { ChakraProvider, useColorModeValue } from '@chakra-ui/react'
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit'

import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import { WagmiConfig } from 'wagmi'
import { useEffect } from 'react'

import { Deploy } from './pages/Deploy'
import { Menu } from './components/Menu'
import { SafeAddressInput } from './components/SafeAddressInput'
import { Transactions } from './pages/Transactions'
import { chains, wagmiConfig } from './wallet'
import { useStore } from './store'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Transactions />,
      },
      {
        path: '/deploy',
        element: <Deploy />
      }
    ]
  }
])

function AppLayout() {
  return <div>
    <Menu />
    <SafeAddressInput />
    <Outlet />
  </div>
}

export function App() {
  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <ChakraProvider>
      <WalletProvider>
        <RouterProvider router={router} />
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
