import SafeProvider from '@safe-global/safe-apps-react-sdk'
import { NextUIProvider } from '@nextui-org/react'
import { StrictMode, useState } from 'react'

import Cannon from './Cannon'
import { Settings, SettingsValues } from './components/Settings'
import { View, Layout } from './components/Layout'

const DEFAULT_SETTINGS = {
  tenderlyKey: '',
  tenderlyProject: '',
  publishIpfsUrl: '',
  ipfsUrl: 'https://ipfs.io',
  registryAddress: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
  registryProviderUrl:
    'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7',
  publishTags: 'latest',
} satisfies SettingsValues

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  return (
    <Providers loader={<span>Loading Safe Provider...</span>}>
      <Layout>
        <View title="Deploy">
          <Cannon settings={settings} />
        </View>
        <View title="Settings">
          <Settings
            defaultValue={DEFAULT_SETTINGS}
            onChange={(v) => setSettings(v)}
          />
        </View>
      </Layout>
    </Providers>
  )
}

function Providers({ loader, children }) {
  return (
    <StrictMode>
      <SafeProvider loader={loader}>
        <NextUIProvider>{children}</NextUIProvider>
      </SafeProvider>
    </StrictMode>
  )
}
