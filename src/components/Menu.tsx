import { Navbar } from '@nextui-org/react'

interface ItemBase {
  title: string
}

interface Props {
  items: ItemBase[]
  value: number
  onChange: (item: number) => void
}

export function Menu({ items, value, onChange }: Props) {
  return (
    <Navbar isCompact maxWidth="xs">
      <Navbar.Content />
      <Navbar.Content enableCursorHighlight variant={'underline'}>
        {items.map(({ title }, index) => (
          <Navbar.Item
            key={index}
            isActive={index === value}
            onClick={() => onChange(index)}
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
