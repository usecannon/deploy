import useLocalStorage from 'react-hook-local-web-storage'
import { Col, Input, Row, Spacer, Text } from '@nextui-org/react'
// import { DebounceInput } from 'react-debounce-input'
import { useEffect } from 'react'

export type SettingsValues = { [k: string]: null | undefined | string }

interface Props<T extends SettingsValues> {
  defaultValue: T
  onChange: (val: T) => void
}

const LABELS = {
  tenderlyKey: {
    title: 'Tenderly API Key',
    description:
      'Provide a Tenderly API key to simulate the build and generate all of the appropriate transactions.',
  },
  tenderlyProject: {
    title: 'Tenderly Project Id',
    description:
      'Prove a Tenderly Project ID that is owned by the API key above.',
  },
  publishIpfsUrl: {
    title: 'IPFS URL for Publishing',
    description:
      'Provide an IPFS URL for publishing the updated Cannon package.',
  },
  ipfsUrl: {
    title: 'IPFS URL for Reading',
    description: 'Provide an IPFS URL to fetch Cannon packages.',
  },
  registryAddress: {
    title: 'Registry Address',
    description: 'Contract address of the Cannon Registry.',
  },
  registryProviderUrl: {
    title: 'Registry Provider RPC URL',
    description: 'JSON RPC url to connect with the Cannon Registry.',
  },
  publishTags: {
    title: 'Package Tags',
    description: 'Custom tags to add to the published Cannon package.',
  },
}

export function Settings<T extends SettingsValues>({
  defaultValue,
  onChange,
}: Props<T>) {
  const [settings, setSettings] = useLocalStorage(defaultValue)
  useEffect(() => onChange(settings), [settings])

  return (
    <>
      {Object.keys(settings).map((key) => (
        <Seeting
          key={key}
          name={key}
          value={settings[key]}
          onChange={(val) => setSettings({ ...settings, [key]: val })}
        />
      ))}
    </>
  )
}

interface SettingProps {
  name: string
  value: string
  onChange: (val: string) => void
}

function Seeting({ name, value, onChange }: SettingProps) {
  return (
    <>
      <Input
        bordered
        label={LABELS[name].title}
        helperText={LABELS[name].description}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
      />
      <Spacer y={1.5} />
    </>
  )
}
