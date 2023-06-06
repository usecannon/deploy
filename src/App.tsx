import { ChakraProvider } from '@chakra-ui/react'
import { useEffect } from 'react'

import { Deploy } from './pages/Deploy'
import { Menu } from './components/Menu'
import { Transactions } from './pages/Transactions'
import { useStore } from './store'

export function App() {
  const page = useStore((s) => s.page)

  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <ChakraProvider>
      <Menu />
      {page === 'deploy' && <Deploy />}
      {page === 'transactions' && <Transactions />}
    </ChakraProvider>
  )
}
