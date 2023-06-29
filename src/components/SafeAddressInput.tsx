import deepEqual from 'fast-deep-equal'
import { Address, useSwitchNetwork } from 'wagmi'
import { Container, FormControl, FormLabel } from '@chakra-ui/react'
import { CreatableSelect } from 'chakra-react-select'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Alert } from './Alert'
import {
  getSafeFromString,
  isValidSafe,
  isValidSafeString,
} from '../hooks/safe'
import { useStore } from '../store'

export function SafeAddressInput() {
  const currentSafe = useStore((s) => s.currentSafe)
  const safeAddresses = useStore((s) => s.safeAddresses)
  const setState = useStore((s) => s.setState)
  const prependSafeAddress = useStore((s) => s.prependSafeAddress)

  const { switchNetwork } = useSwitchNetwork()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentSafeIdx = currentSafe
    ? safeAddresses.findIndex((s) => deepEqual(currentSafe, s))
    : -1
  const safeOptions = safeAddresses.map((safe, index) => ({
    value: index,
    label: `${safe.chainId}:${safe.address}`,
  }))

  // Load the safe address from url
  useEffect(() => {
    if (searchParams.has('address') || searchParams.has('chainId')) {
      const chainId = Number.parseInt(searchParams.get('chainId'))
      const address = searchParams.get('address') as Address

      const newSafe = { address, chainId }

      if (isValidSafe(newSafe)) {
        if (!deepEqual(currentSafe, newSafe)) {
          setState({ currentSafe: newSafe })
        }

        if (!safeAddresses.some((s) => deepEqual(newSafe, s))) {
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
  function handleSafeChange(index: number) {
    if (index === -1) {
      searchParams.delete('chainId')
      searchParams.delete('address')
      setSearchParams(searchParams)
      setState({ currentSafe: null })
      return
    }

    const selectedSafe = safeAddresses[index]

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
      <FormControl mb="4">
        <FormLabel>Current Safe</FormLabel>
        <CreatableSelect
          isClearable
          value={currentSafeIdx > -1 ? safeOptions[currentSafeIdx] : null}
          options={safeOptions}
          onChange={(selected) =>
            handleSafeChange(selected ? selected.value : -1)
          }
          onCreateOption={handleSafeCreate}
          isValidNewOption={(input) => {
            console.log('->', input, isValidSafeString(input))
            return isValidSafeString(input)
          }}
        />
      </FormControl>
      {!currentSafe && <Alert status="info">Choose a safe to start</Alert>}
    </Container>
  )
}
