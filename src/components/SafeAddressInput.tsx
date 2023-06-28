import {
  Container,
  FormControl,
  FormLabel,
  Select,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSwitchNetwork } from 'wagmi'

import { useStore } from '../store'

export function SafeAddressInput() {
  const safeAddresses = useStore((s) => s.safeAddresses)
  const setSelectedSafeAddress = useStore((s) => s.setSelectedSafe)

  const { switchNetwork } = useSwitchNetwork()
  const [searchParams, setSearchParams] = useSearchParams()

  if (
    safeAddresses.length > 0 &&
    (!searchParams.get('address') || !searchParams.get('chainId'))
  ) {
    setSelectedSafe(
      `${searchParams.get('address')}:${searchParams.get('chainId')}`
    )
  }

  // Load the safe address from url
  useEffect(() => {
    const loadedSafeAddress = searchParams.get('address')
    const loadedChainId = searchParams.get('chainId')

    if (loadedSafeAddress && loadedChainId) {
      setSelectedSafe(`${loadedSafeAddress}:${loadedChainId}`)
    }
  }, [])

  // If the user puts a correct address in the input, update the url
  function setSelectedSafe(v: string) {
    const [safeAddress, chainId] = v.split(':')

    const newSafeIdx = safeAddresses.findIndex(
      (s) => s.address === safeAddress && s.chainId.toString() === chainId
    )

    console.log('THE NEW SAFE IDX IS', newSafeIdx)
    if (newSafeIdx !== -1) {
      setSelectedSafeAddress(newSafeIdx)
    }

    setSearchParams([
      ['address', safeAddress],
      ['chainId', chainId],
    ])

    if (switchNetwork) {
      console.log('NETWORK CAN BE SWITCHED!')
      switchNetwork(parseInt(chainId))
    }
  }

  return (
    <Container maxW="100%" w="container.sm" pt="4" pb="8">
      <FormControl mb="4">
        <FormLabel>Safe Address</FormLabel>
        <Select
          value={`${searchParams.get('address')}:${searchParams.get(
            'chainId'
          )}`}
          onChange={(event) => setSelectedSafe(event.currentTarget.value)}
        >
          {safeAddresses.map((o, i) => (
            <option key={i} value={`${o.address}:${o.chainId}`}>
              {o.address} ({o.chainId})
            </option>
          ))}
        </Select>
      </FormControl>
    </Container>
  )
}
