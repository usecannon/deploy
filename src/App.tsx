import SafeProvider from '@safe-global/safe-apps-react-sdk'
import { StrictMode } from 'react'

import Cannon from './Cannon'

export function App() {
  return (
    <StrictMode>
      <SafeProvider loader={<span>Loading Safe Provider...</span>}>
        <Cannon />
      </SafeProvider>
    </StrictMode>
  )
}
