import { StrictMode, useEffect } from 'react'

import { Deploy } from './pages/Deploy'

export function App() {
  // Enable debugging of cannon
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('debug', 'cannon*')
  }, [])

  return (
    <StrictMode>
      <Deploy />
    </StrictMode>
  )
}
