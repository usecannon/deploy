import './index.css'

import { createRoot } from 'react-dom/client'

import { App } from './App'
import { ColorModeScript } from '@chakra-ui/react'
import theme from './theme'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <>
    {/* 👇 Here's the script */}
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <App />
  </>
)
