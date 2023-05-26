import entries from 'just-entries'
import { Container, Spacer, Text } from '@nextui-org/react'

import { Alert } from '../components/Alert'
import { Input } from '../components/Input'
import { Store, useStore } from '../store'
import { isIpfsUploadEndpoint } from '../utils/ipfs'

type Setting = {
  title: string
  description: string
  password?: boolean
  optional?: boolean
  // Validate function should return an error message if the value is invalid
  validate?: (value: string) => string | undefined
}

const SETTINGS: Record<keyof Store['settings'], Setting> = {
  ipfsUrl: {
    title: 'IPFS node URL',
    description:
      'Provide an IPFS URL to fetch Cannon packages and upload new builds.',
    validate: (val: string) => {
      if (val && !isIpfsUploadEndpoint(val)) {
        return 'Looks like you configured an IPFS URL that is not running on port 5001 nor is using the protocol https+ipfs://, which means that the gateway is not compatible with uploading new files. Are you sure you are using the correct ipfs node url?'
      }
    },
  },
  forkProviderUrl: {
    title: 'RPC URL for Local Fork',
    description:
      '(Optional) JSON RPC url to create the local fork from. If not provided, the default RPC url for the selected chain will be used.',
    optional: true,
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

export function Settings() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)

  return (
    <Container xs>
      {entries(SETTINGS).map(([key, s]) => {
        const validationError = s.validate?.(settings[key])

        return (
          <div key={key}>
            <Input
              key={key}
              name={key}
              label={s.title}
              helperText={s.description}
              value={settings[key]}
              onChange={(val) => setSettings({ [key]: val })}
              password={s.password}
              required={!s.optional}
              valid={!validationError}
            />
            {validationError && (
              <>
                <Spacer y={1.2} />
                <Alert variant="error">
                  <Text>{validationError}</Text>
                </Alert>
              </>
            )}
            <Spacer y={2} />
          </div>
        )
      })}
    </Container>
  )
}
