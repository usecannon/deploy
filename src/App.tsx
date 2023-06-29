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

import { Deploy } from './pages/Deploy'
import { Menu } from './components/Menu'
import { RunCustom } from './pages/RunCustom'
import { SafeAddressInput } from './components/SafeAddressInput'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionDetail } from './pages/TransactionDetail'
import { Transactions } from './pages/Transactions'
import { chains, wagmiConfig } from './wallet'
import { useStore } from './store'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    element: <SafeLayout />,
    children: [
      {
        path: '/',
        element: <Transactions />,
      },
      {
        path: '/transactions',
        element: <RunCustom />,
      },
      {
        path: '/gitops-diffs',
        element: <Deploy />,
      },
    ],
  },
  {
    element: <PlainLayout />,
    children: [
      {
        path: '/settings',
        element: <SettingsPage />,
      },
      {
        path: '/txn/:chainId/:safeAddress/:nonce',
        element: <TransactionDetail />,
      },
    ],
  },
])

function PlainLayout() {
  return (
    <>
      <Menu />
      <Outlet />
    </>
  )
}

function SafeLayout() {
  const currentSafe = useStore((s) => s.currentSafe)

  return (
    <>
      <Menu />
      <SafeAddressInput />
      {currentSafe && <Outlet />}
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
