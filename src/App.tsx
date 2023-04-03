import SafeProvider from '@safe-global/safe-apps-react-sdk'
import { NextUIProvider, createTheme } from '@nextui-org/react'
import { StrictMode, useState } from 'react'

import Cannon from './Cannon'
import { Settings, SettingsValues } from './components/Settings'
import { View, Layout } from './components/Layout'

const INITIAL_SETTINGS = {
  tenderlyKey: '',
  tenderlyProject: '',
  publishIpfsUrl: '',
  ipfsUrl: 'https://ipfs.io',
  registryAddress: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
  registryProviderUrl:
    'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7',
  publishTags: 'latest',
} satisfies SettingsValues

// Load existant values in localstotage
for (const key of Object.keys(INITIAL_SETTINGS)) {
  const saved = localStorage.getItem(key)
  if (saved) INITIAL_SETTINGS[key] = saved
}

// Enable debugging of cannon build
if (typeof window !== 'undefined') {
  localStorage.setItem('debug', 'cannon*')
}

export function App() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS)

  return (
    <Providers loader={<span>Loading Safe Provider...</span>}>
      <Layout>
        <View title="Deploy">
          <Cannon settings={settings} />
        </View>
        <View title="Settings">
          <Settings
            defaultValue={INITIAL_SETTINGS}
            onChange={(v) => setSettings(v)}
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
