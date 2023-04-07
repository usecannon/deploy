import SafeProvider from '@safe-global/safe-apps-react-sdk'
import { NextUIProvider, createTheme } from '@nextui-org/react'
import { StrictMode, useEffect } from 'react'

import { Cannon } from './views/Cannon'
import { Layout, View } from './components/Layout'
import { Settings } from './views/Settings'
import { useSettings } from './hooks/settings'

export function App() {
  const [settings, setSettingValue, SETTINGS] = useSettings()

  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <Providers loader={<span>Loading Safe Provider...</span>}>
      <Layout>
        <View title="Deploy">
          <Cannon settings={settings} />
        </View>
        <View title="Settings">
          <Settings
            value={settings}
            onValueChange={setSettingValue}
            labels={SETTINGS}
          />
        </View>
      </Layout>
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
