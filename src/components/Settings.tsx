import entries from 'just-entries'
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
} from '@chakra-ui/react'

import { Store, useStore } from '../store'
import { isIpfsUploadEndpoint } from '../utils/ipfs'
import { validatePreset } from '../utils/cannon'
import { Address, isAddress } from 'viem'
import { AddIcon, MinusIcon } from '@chakra-ui/icons'

type Setting = {
  title: string
  placeholder?: string
  description?: string
  password?: boolean
  optional?: boolean
  // Validate function should return an error message if the value is invalid
  validate?: (value: string) => string | undefined
}

const SETTINGS: Record<keyof Store['settings'], Setting> = {
  ipfsUrl: {
    title: 'IPFS node URL',
    placeholder: 'http://localhost:5001',
    description:
      'Provide an IPFS URL to fetch Cannon packages and upload new builds.',
    validate: (val: string) => {
      if (val && !isIpfsUploadEndpoint(val)) {
        return 'Looks like you configured an IPFS URL that is not running on port 5001 nor is using the protocol https+ipfs://, which means that the gateway is not compatible with uploading new files. Are you sure you are using the correct ipfs node url?'
      }
    },
  },
  stagingUrl: {
    title: 'Staging Service URL',
    placeholder: 'https://service.com',
    description: 'Provide a URL to stage transactions. Must be the same as other staged transaction operators to accumulate signatures.',
  },
  publishTags: {
    title: 'Package Tags',
    description:
      'Custom tags to add to the published Cannon package. Should be a string separated by commas.',
  },
  preset: {
    title: 'Package Preset',
    placeholder: 'main',
    description: 'Select the preset that will be used to build the package.',
    validate: (val: string) => {
      if (val && !validatePreset(val)) {
        return 'Invalid preset. Should only include lowercase letters.'
      }
    },
  },
  registryAddress: {
    title: 'Registry Address',
    description: 'Contract address of the Cannon Registry.',
  },
  registryProviderUrl: {
    title: 'Registry Provider RPC URL',
    description: 'JSON RPC url to connect with the Cannon Registry.',
  },
  forkProviderUrl: {
    title: 'RPC URL for Local Fork',
    description:
      'JSON RPC url to create the local fork where the build will be executed. If not provided, the default RPC url from your wallet will be used.',
    optional: true,
  },
}

export function useSettingsValidation() {
  const settings = useStore((s) => s.settings)

  return !entries(SETTINGS).some(([key, s]) => {
    const val = settings[key]
    return (!s.optional && !val) || !!s.validate?.(val)
  })
}

export function Settings() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const safeAddresses = useStore((s) => s.safeAddresses)
  const setSafeAddresses = useStore((s) => s.setSafeAddresses)

  return (
    <>
      <FormControl
        key={'safeaddrs'}
        isRequired={true}
        mb="4"
      >
        <FormLabel>Safe Addresses</FormLabel>
        {safeAddresses.map((safeAddress, i) => <HStack>
          <Input
            type={'text'}
            placeholder={'0x000...'}
            defaultValue={safeAddress.address}
            onChange={(evt) => {
              if (isAddress(evt.target.value)) {
                safeAddresses[i].address = evt.target.value
                setSafeAddresses(safeAddresses)
              }
            }}
          />
          <Input
            type={'text'}
            placeholder={'1'}
            defaultValue={safeAddress.chainId}
            onChange={(evt) => {
              try {
                safeAddresses[i].chainId = parseInt(evt.target.value)
                setSafeAddresses(safeAddresses)
              } catch (err) {
                // validation
              }
            }}
          />
        </HStack>)}

        <HStack>
          <Button onClick={() => setSafeAddresses(safeAddresses.concat([{ address: '' as Address, chainId: 0 }]))}><AddIcon /></Button>
          {safeAddresses.length > 1 && <Button onClick={() => setSafeAddresses(safeAddresses.slice(0, safeAddresses.length - 1))}><MinusIcon /></Button>}
        </HStack>
        
        <FormHelperText>Provide a list of addresses and chains for each gnosis safe you want to interact with.</FormHelperText>
      </FormControl>
      {entries(SETTINGS).map(([key, s]) => {
        const val = settings[key]
        const validationError =
          !s.optional && !val ? s.description : s.validate?.(settings[key])

        return (
          <FormControl
            key={key}
            isInvalid={!!validationError}
            isRequired={!s.optional}
            mb="4"
          >
            <FormLabel>{s.title}</FormLabel>
            <Input
              type={s.password ? 'password' : 'text'}
              name={key}
              placeholder={s.placeholder}
              value={settings[key]}
              onChange={(evt) => setSettings({ [key]: evt.target.value })}
            />
            {!validationError && s.description && (
              <FormHelperText>{s.description}</FormHelperText>
            )}
            {validationError && (
              <FormErrorMessage>{validationError}</FormErrorMessage>
            )}
          </FormControl>
        )
      })}
    </>
  )
}
