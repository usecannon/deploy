import { Navbar } from '@nextui-org/react'
import entries from 'just-entries'

import { Store, useStore } from '../store'

const items = {
  build: 'Build',
  settings: 'Settings',
  history: 'History',
} satisfies Record<Store['page'], string>

export function Menu() {
  const currentPage = useStore((s) => s.page)
  const setState = useStore((s) => s.setState)

  return (
    <Navbar isCompact maxWidth="xs">
      <Navbar.Content />
      <Navbar.Content enableCursorHighlight variant={'underline'}>
        {entries(items).map(([page, title]) => (
          <Navbar.Item
            key={page}
            isActive={page === currentPage}
            onClick={() => setState({ page })}
            css={{ cursor: 'pointer' }}
          >
            {title}
          </Navbar.Item>
        ))}
      </Navbar.Content>
      <Navbar.Content />
    </Navbar>
  )
}
