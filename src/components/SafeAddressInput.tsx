import deepEqual from 'fast-deep-equal'
import { Container, FormControl, FormLabel } from '@chakra-ui/react'
import { CreatableSelect } from 'chakra-react-select'
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

export function SafeAddressInput() {
  const currentSafe = useStore((s) => s.currentSafe)
  const safeAddresses = useStore((s) => s.safeAddresses)
  const setState = useStore((s) => s.setState)
  const prependSafeAddress = useStore((s) => s.prependSafeAddress)
  const walletSafes = useWalletPublicSafes()

  const { switchNetwork } = useSwitchNetwork()
  const [searchParams, setSearchParams] = useSearchParams()

  const safeOptions = _safesToOptions(safeAddresses)
  const walletSafeOptions = _safesToOptions(walletSafes)

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

    setState({ currentSafe: selectedSafe })
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
      // handleSafeChange(0)
    }
  }

  return (
    <Container maxW="100%" w="container.sm" pt="4" pb="8">
      <FormControl mb="6">
        <FormLabel>Safe</FormLabel>
        <CreatableSelect
          isClearable
          value={currentSafe ? _safeToOption(currentSafe) : null}
          options={[
            ...safeOptions,
            {
              label: 'Fetched Wallet Safes',
              options: walletSafeOptions,
            },
          ]}
          onChange={(selected) => handleSafeChange(selected.value || null)}
          onCreateOption={handleSafeCreate}
          isValidNewOption={(input) => {
            return isValidSafeString(input)
          }}
        />
      </FormControl>
      {!currentSafe && (
        <Alert status="info">Select a Safe from the dropdown above.</Alert>
      )}
    </Container>
  )
}

function _safeToOption(safe: State['currentSafe']) {
  return {
    value: safeToString(safe),
    label: safeToString(safe) as string,
  }
}

function _safesToOptions(safes: State['safeAddresses']) {
  return safes.map(_safeToOption)
}
