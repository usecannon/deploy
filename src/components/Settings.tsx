import { Input, Spacer } from '@nextui-org/react'

export type SettingsValues = { [k: string]: string }
export type SettingsLabels = {
  [k: string]: { title: string; description: string }
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
    <>
      {Object.keys(value).map((key) => (
        <div key={key}>
          <Input
            key={key}
            name={key}
            label={labels[key].title}
            helperText={labels[key].description}
            initialValue={value[key]}
            onChange={(evt) => onValueChange(key, evt.target.value)}
            bordered
            fullWidth
          />
          <Spacer y={2} />
        </div>
      ))}
    </>
  )
}
