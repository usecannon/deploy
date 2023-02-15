import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0px;
    padding: 0px;
    height: 100vh;
    width: 100vw;
  }

  html {
    font-family: 'DM Sans', sans-serif;
  }

  #root {
    height: 100%;
    padding-right: 0.5rem;
  }
`

export default GlobalStyle
