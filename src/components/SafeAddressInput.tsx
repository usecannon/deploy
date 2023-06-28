import deepEqual from 'fast-deep-equal'
import { Address, useSwitchNetwork } from 'wagmi'
import {
  Alert,
  Container,
  FormControl,
  FormLabel,
  Select,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { isValidSafe } from '../hooks/safe'
import { useStore } from '../store'

export function SafeAddressInput() {
  const currentSafe = useStore((s) => s.currentSafe)
  const safeAddresses = useStore((s) => s.safeAddresses)
  const setState = useStore((s) => s.setState)

  const { switchNetwork } = useSwitchNetwork()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const currentSafeIdx = currentSafe
    ? safeAddresses.findIndex((s) => deepEqual(currentSafe, s))
    : -1

  // Load the safe address from url
  useEffect(() => {
    if (searchParams.has('address') || searchParams.has('chainId')) {
      const address = searchParams.get('address') as Address
      const chainId = Number.parseInt(searchParams.get('chainId'))

      const newSafe = { address, chainId }

      if (isValidSafe(newSafe)) {
        setState({ currentSafe: newSafe })

        if (!safeAddresses.some((s) => deepEqual(newSafe, s))) {
          setState({
            safeAddresses: [newSafe, ...safeAddresses],
          })
        }
      } else {
        searchParams.delete('address')
        searchParams.delete('chainId')
        setSearchParams(searchParams)
      }
    } else if (safeAddresses.length > 0) {
      const newSafe = safeAddresses[0]

      if (!currentSafe) {
        setState({ currentSafe: newSafe })
      }

      searchParams.set('address', newSafe.address)
      searchParams.set('chainId', newSafe.chainId.toString())
      setSearchParams(searchParams)

      if (switchNetwork) {
        switchNetwork(newSafe.chainId)
      }
    }
  }, [location])

  // If the user puts a correct address in the input, update the url
  function setSelectedSafe(index: number) {
    const selectedSafe = safeAddresses[index]

    if (!selectedSafe) {
      searchParams.delete('address')
      searchParams.delete('chainId')
      setSearchParams(searchParams)

      return
    }

    searchParams.set('address', selectedSafe.address)
    searchParams.set('chainId', selectedSafe.chainId.toString())
    setSearchParams(searchParams)

    if (switchNetwork) {
      switchNetwork(selectedSafe.chainId)
    }
  }

  return (
    <Container maxW="100%" w="container.sm" pt="4" pb="8">
      <FormControl mb="4">
        <FormLabel>Safe Address</FormLabel>
        <Select
          value={currentSafeIdx}
          onChange={(event) =>
            setSelectedSafe(Number.parseInt(event.currentTarget.value))
          }
        >
          {safeAddresses.map((safe, index) => (
            <option key={index} value={index}>
              {safe.address} (chainId: {safe.chainId})
            </option>
          ))}
        </Select>
      </FormControl>
      {!currentSafe && <Alert status="info">Select a Safe to start</Alert>}
    </Container>
  )
}
