import SafeProvider from '@safe-global/safe-apps-react-sdk'
import { Container, NextUIProvider } from '@nextui-org/react'
import { StrictMode, useState } from 'react'

import Cannon from './Cannon'
import { Menu } from './components/Menu'
import { Settings, SettingsValues } from './components/Settings'

const VIEWS = [
  { id: 'deploy', title: 'Deploy' },
  { id: 'settings', title: 'Settings' },
]

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
  const [view, setCurrentView] = useState(VIEWS[0])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  return (
    <Providers loader={<span>Loading Safe Provider...</span>}>
      <Menu
        items={VIEWS}
        value={view}
        onChange={(view) => setCurrentView(view)}
      />
      <Container xs>
        {view.id === 'deploy' && <Cannon settings={settings} />}
        {view.id === 'settings' && (
          <Settings
            defaultValue={DEFAULT_SETTINGS}
            onChange={(v) => setSettings(v)}
          />
        )}
      </Container>
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
