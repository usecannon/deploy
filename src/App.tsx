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
        loader={
          <>
            <Title size="md">Waiting for Safe...</Title>
            <Loader size="md" />
          </>
        }
      > SafeProvider Loaded
        {/* <Cannon /> */}
      </SafeProvider>
    </ThemeProvider>
  )
}

export default App
