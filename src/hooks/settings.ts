import { useEffect, useState } from 'react'

const SETTINGS = {
  publishIpfsUrl: {
    title: 'IPFS URL for Publishing',
    description:
      'Provide an IPFS URL for publishing the updated Cannon package.',
    defaultValue: '',
  },
  ipfsUrl: {
    title: 'IPFS URL for Reading',
    description: 'Provide an IPFS URL to fetch Cannon packages.',
    defaultValue: 'https://ipfs.io',
  },
  registryAddress: {
    title: 'Registry Address',
    description: 'Contract address of the Cannon Registry.',
    defaultValue: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
  },
  registryProviderUrl: {
    title: 'Registry Provider RPC URL',
    description: 'JSON RPC url to connect with the Cannon Registry.',
    defaultValue:
      'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7',
  },
  publishTags: {
    title: 'Package Tags',
    description: 'Custom tags to add to the published Cannon package.',
    defaultValue: 'latest',
  },
  forkProviderUrl: {
    title: 'RPC URL for Local Fork',
    description:
      '(Optional) JSON RPC url to create the local fork from. If not provided, the default RPC url for the selected chain will be used.',
    defaultValue: '',
  },
} as const

const DEFAULT_STATE = Object.fromEntries(
  Object.entries(SETTINGS).map(([k, v]) => [k, v.defaultValue])
) as { [k in keyof typeof SETTINGS]: string }

export type TSettings = typeof DEFAULT_STATE

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_STATE)

  // Load existant values from localStorage on first render
  useEffect(() => {
    const newSettings = { ...settings }
    for (const key of Object.keys(SETTINGS)) {
      const saved = localStorage.getItem(key)
      if (saved) newSettings[key] = saved
    }
    setSettings(newSettings)
  }, [])

  const setSettingValue = (key: string, val: string) => {
    localStorage.setItem(key, val)
    setSettings({ ...settings, [key]: val })
  }

  return [settings, setSettingValue, SETTINGS] as const
}
