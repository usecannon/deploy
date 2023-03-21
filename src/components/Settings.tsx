import useLocalStorage from 'react-hook-local-web-storage'
import { DebounceInput } from 'react-debounce-input'
import { useEffect } from 'react'

import { useDebounceOnce } from '../utils/use-debounce-once'

export type SettingsValues = { [k: string]: null | undefined | string }

interface Props<T> {
  defaultValue: T
  onChange: (val: T) => void
}

export function Settings<T extends SettingsValues>({
  defaultValue,
  onChange,
}: Props<T>) {
  const [settings, setSettings] = useLocalStorage(defaultValue)

  // Set default settings, with 300ms delay to make sure that values are loaded from localstorage
  useDebounceOnce(
    () => {
      const defaulted = { ...settings }
      for (const [key, val] of Object.entries(defaultValue)) {
        if (!val || settings[key]) continue
        if (val !== settings[key]) defaulted[key] = val
      }
      setSettings(defaulted)
    },
    [settings],
    300
  )

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
