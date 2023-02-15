import React from 'react'
import { ThemeProvider } from 'styled-components'
import { theme, Loader, Title } from '@gnosis.pm/safe-react-components'
import SafeProvider from '@safe-global/safe-apps-react-sdk'

import GlobalStyle from './GlobalStyle'
// import Cannon from './Cannon'

function App () {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <SafeProvider
        loader={<Loader size="sm" />}
      >
        <span>SafeProvider Loaded</span>
        {/* <Cannon /> */}
      </SafeProvider>
    </ThemeProvider>
  )
}

export default App
