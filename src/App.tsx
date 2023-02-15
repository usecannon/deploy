import { StrictMode } from 'react'
import SafeProvider from '@safe-global/safe-apps-react-sdk'

import Cannon from './Cannon'

export function App () {
  return (
    <StrictMode>
      <SafeProvider
        loader={<span>Loading...</span>}
      >
        <Cannon />
      </SafeProvider>
    </StrictMode>
  )
}
