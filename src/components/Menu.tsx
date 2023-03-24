import { Navbar } from '@nextui-org/react'

interface ItemBase {
  id: string
  title: string
}

interface Props<T extends ItemBase> {
  items: T[]
  value: T
  onChange: (item: T) => void
}

export function Menu<T extends ItemBase>({ items, value, onChange }: Props<T>) {
  return (
    <Navbar isCompact maxWidth="xs">
      <Navbar.Content />
      <Navbar.Content enableCursorHighlight variant={'underline'}>
        {items.map((item) => (
          <Navbar.Item
            isActive={item.id === value.id}
            onClick={() => onChange(item)}
            css={{ cursor: 'pointer' }}
          >
            {item.title}
          </Navbar.Item>
        ))}
      </Navbar.Content>
      <Navbar.Content />
    </Navbar>
  )
}
