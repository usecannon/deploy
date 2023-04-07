import { Container, Spacer } from '@nextui-org/react'

import { Input } from '../components/Input'

export type SettingsValues = { [k: string]: string }
export type SettingsLabels = {
  [k: string]: { title: string; description: string; isPassword?: boolean }
}

interface Props<T extends SettingsValues> {
  value: T
  labels: SettingsLabels
  onValueChange: (key: string, val: string) => void
}

export function Settings<T extends SettingsValues>({
  value,
  onValueChange,
  labels,
}: Props<T>) {
  return (
    <Container xs>
      {Object.keys(value).map((key) => (
        <div key={key}>
          <Input
            key={key}
            name={key}
            label={labels[key].title}
            helperText={labels[key].description}
            value={value[key]}
            onChange={(val) => onValueChange(key, val)}
            password={labels[key].isPassword}
          />
          <Spacer y={2} />
        </div>
      ))}
    </Container>
  )
}
