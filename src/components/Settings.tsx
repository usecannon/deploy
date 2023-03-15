import useLocalStorage from 'react-hook-local-web-storage'
import { DebounceInput } from 'react-debounce-input'
import { useEffect } from 'react'

interface Props<T> {
  defaultValue: T
  onChange: (val: T) => void
}

export function Settings<T>({ defaultValue, onChange }: Props<T>) {
  const [settings, setSettings] = useLocalStorage(defaultValue)

  useEffect(() => onChange(settings), [settings])

  return (
    <div>
      <h2>Settings</h2>
      {Object.keys(settings).map((key) => (
        <Seeting
          key={key}
          name={key}
          value={settings[key]}
          onChange={(val) => setSettings({ ...settings, [key]: val })}
        />
      ))}
    </div>
  )
}

interface SettingProps {
  name: string
  value: string
  onChange: (val: string) => void
}

function Seeting({ name, value, onChange }: SettingProps) {
  return (
    <div>
      <label htmlFor={name}>{name}:&nbsp;</label>
      <DebounceInput
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
