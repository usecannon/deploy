import deepEqual from 'fast-deep-equal'
import { CloseIcon } from '@chakra-ui/icons'
import {
  Container,
  FormControl,
  FormLabel,
  IconButton,
  Spacer,
} from '@chakra-ui/react'
import {
  CreatableSelect,
  OptionProps,
  chakraComponents,
} from 'chakra-react-select'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSwitchNetwork } from 'wagmi'

import { Alert } from './Alert'
import {
  SafeString,
  getSafeFromString,
  isValidSafe,
  isValidSafeString,
  parseSafe,
  safeToString,
  useWalletPublicSafes,
} from '../hooks/safe'
import { State, useStore } from '../store'
import { includes } from '../utils/array'

type SafeOption = {
  value: SafeString
  label: string
  isDeletable?: boolean
}

export function SafeAddressInput() {
  const currentSafe = useStore((s) => s.currentSafe)
  const safeAddresses = useStore((s) => s.safeAddresses)
  const setState = useStore((s) => s.setState)
  const setCurrentSafe = useStore((s) => s.setCurrentSafe)
  const deleteSafe = useStore((s) => s.deleteSafe)
  const prependSafeAddress = useStore((s) => s.prependSafeAddress)
  const walletSafes = useWalletPublicSafes()

  const { switchNetwork } = useSwitchNetwork()
  const [searchParams, setSearchParams] = useSearchParams()

  const safeOptions = _safesToOptions(safeAddresses, { isDeletable: true })
  const walletSafeOptions = _safesToOptions(
    walletSafes.filter((s) => !includes(safeAddresses, s))
  )

  // Load the safe address from url
  useEffect(() => {
    if (searchParams.has('address') || searchParams.has('chainId')) {
      const chainId = searchParams.get('chainId')
      const address = searchParams.get('address')
      const newSafe = parseSafe(`${chainId}:${address}`)

      if (isValidSafe(newSafe)) {
        if (!deepEqual(currentSafe, newSafe)) {
          setState({ currentSafe: newSafe })
        }

        if (!includes(safeAddresses, newSafe)) {
          prependSafeAddress(newSafe)
        }
      } else {
        searchParams.delete('chainId')
        searchParams.delete('address')
        setSearchParams(searchParams)
      }
    }
  }, [])

  // If the user puts a correct address in the input, update the url
  function handleSafeChange(safeString: SafeString) {
    if (!safeString) {
      searchParams.delete('chainId')
      searchParams.delete('address')
      setSearchParams(searchParams)
      setState({ currentSafe: null })
      return
    }

    const selectedSafe = parseSafe(safeString)

    setCurrentSafe(selectedSafe)
    searchParams.set('chainId', selectedSafe.chainId.toString())
    searchParams.set('address', selectedSafe.address)
    setSearchParams(searchParams)

    if (switchNetwork) {
      switchNetwork(selectedSafe.chainId)
    }
  }

  function handleSafeCreate(newSafeAddress: string) {
    const newSafe = getSafeFromString(newSafeAddress)
    if (newSafe) {
      prependSafeAddress(newSafe)
    }
  }

  function handleSafeDelete(safeString: SafeString) {
    deleteSafe(parseSafe(safeString))
  }

  return (
    <Container maxW="100%" w="container.md" pt="4" pb="4">
      <FormControl mb="6">
        <FormLabel>Safe</FormLabel>
        <CreatableSelect
          variant="filled"
          isClearable
          value={currentSafe ? _safeToOption(currentSafe) : null}
          options={[
            ...safeOptions,
            {
              label: 'Connected Wallet Safes',
              options: walletSafeOptions,
            },
          ]}
          onChange={(selected: SafeOption) =>
            handleSafeChange(selected?.value || null)
          }
          onCreateOption={handleSafeCreate}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore-next-line
          onDeleteOption={(selected: SafeOption) =>
            handleSafeDelete(selected?.value || null)
          }
          isValidNewOption={(input) => {
            return isValidSafeString(input)
          }}
          components={{ Option: DeletableOption }}
        />
      </FormControl>
      {!currentSafe && (
        <Alert status="info">Select a Safe from the dropdown above.</Alert>
      )}
    </Container>
  )
}

function DeletableOption({
  children,
  ...props
}: OptionProps<SafeOption> & {
  selectProps?: { onDeleteOption?: (value: SafeOption) => void }
}) {
  const onDelete = props.selectProps?.onDeleteOption
  return (
    <chakraComponents.Option {...props}>
      {children}
      {onDelete && props.data.isDeletable && (
        <>
          <Spacer />
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Delete Option"
            icon={<CloseIcon />}
            onClick={(evt) => {
              evt.preventDefault()
              evt.stopPropagation()
              onDelete(props.data)
            }}
          />
        </>
      )}
    </chakraComponents.Option>
  )
}

function _safeToOption(
  safe: State['currentSafe'],
  extraProps: { isDeletable?: boolean } = {}
) {
  const option = {
    value: safeToString(safe),
    label: safeToString(safe) as string,
  } as SafeOption
  if (extraProps.isDeletable) option.isDeletable = true
  return option
}

function _safesToOptions(
  safes: State['safeAddresses'],
  extraProps: { isDeletable?: boolean } = {}
) {
  return safes.map((s) => _safeToOption(s, extraProps))
}
