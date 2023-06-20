import { ChakraProvider, useColorModeValue } from '@chakra-ui/react'
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit'
import { WagmiConfig } from 'wagmi'
import { useEffect } from 'react'

import { Build } from './pages/Build'
import { Deploy } from './pages/Deploy'
import { Menu } from './components/Menu'
import { RunCustom } from './pages/RunCustom'
import { SafeAddressInput } from './components/SafeAddressInput'
import { TransactionDetail } from './pages/TransactionDetail'
import { Transactions } from './pages/Transactions'
import { chains, wagmiConfig } from './wallet'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <Transactions />,
      },
      {
        path: '/build',
        element: <Build />,
      },
      {
        path: '/deploy',
        element: <Deploy />,
      },
      {
        path: '/run',
        element: <RunCustom />,
      },
      {
        path: '/txn/:chainId/:safeAddress/:nonce',
        element: <TransactionDetail />,
      },
    ],
  },
])

function AppLayout() {
  return (
    <>
      <Menu />
      <SafeAddressInput />
      <Outlet />
    </>
  )
}

export function App() {
  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <ChakraProvider>
      <WalletProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
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
