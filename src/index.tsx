import { ColorModeScript } from '@chakra-ui/react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import theme from './theme'
import './index.css'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <App />
  </>
)
