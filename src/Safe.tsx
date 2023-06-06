import SafeProvider from '@safe-global/safe-apps-react-sdk'
import { NextUIProvider, Spacer, createTheme } from '@nextui-org/react'
import { StrictMode, useEffect } from 'react'

import { Build } from './pages/Build'
import { History } from './pages/History'
import { Menu } from './components/Menu'
import { Settings } from './pages/Settings'
import { useStore } from './store'

export function App() {
  const page = useStore((s) => s.page)

  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <Providers loader={<span>Loading Safe Provider...</span>}>
      <Menu />
      <Spacer y={2} />
      {page === 'build' && <Build />}
      {page === 'settings' && <Settings />}
      {page === 'history' && <History />}
    </Providers>
  )
}

const theme = createTheme({
  type: 'dark',
})

function Providers({ loader, children }) {
  return (
    <StrictMode>
      <SafeProvider loader={loader}>
        <NextUIProvider theme={theme}>{children}</NextUIProvider>
      </SafeProvider>
    </StrictMode>
  )
}
