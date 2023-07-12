import { ChakraProvider, useColorModeValue } from '@chakra-ui/react'
import { darkTheme, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { WagmiConfig } from 'wagmi'
import { Menu } from './components/Menu'
import { SafeAddressInput } from './components/SafeAddressInput'
import { Deploy } from './pages/Deploy'
import { RunCustom } from './pages/RunCustom'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionDetail } from './pages/TransactionDetail'
import { Transactions } from './pages/Transactions'
import { useStore } from './store'
import theme from './theme'
import { chains, wagmiConfig } from './wallet'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <SafeLayout />,
    children: [
      {
        path: '/',
        element: <Transactions />,
      },
      {
        path: '/queue',
        element: <RunCustom />,
      },
      {
        path: '/gitops',
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
      {
        path: '/txn/:chainId/:safeAddress/:nonce/:sigHash',
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
    <ChakraProvider theme={theme}>
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
