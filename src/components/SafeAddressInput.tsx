import {
  Container,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  LinkBox,
  LinkOverlay,
  Select,
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSwitchNetwork } from 'wagmi'

import * as query from '../utils/query'
import { getSafeAddress, getSafeUrl } from '../hooks/safe'
import { useStore } from '../store'

export function SafeAddressInput() {
  const safeAddresses = useStore((s) => s.safeAddresses)

  const { switchNetwork } = useSwitchNetwork()

  if (
    safeAddresses.length > 0 &&
    (!query.get('address') || !query.get('chainId'))
  ) {
    query.set('address', safeAddresses[0].address)
    query.set('chainId', safeAddresses[0].chainId.toString())
  }

  // Load the safe address from url
  useEffect(() => {
    const loadedSafeAddress = query.get('address')
    const loadedChainId = query.get('chainId')

    if (loadedSafeAddress && loadedChainId)
      setSelectedSafe(`${loadedSafeAddress}:${loadedChainId}`)
  }, [])

  // If the user puts a correct address in the input, update the url
  function setSelectedSafe(v: string) {
    const [safeAddress, chainId] = v.split(':')
    query.set('address', safeAddress)
    query.set('chainId', chainId)

    if (switchNetwork) {
      switchNetwork(parseInt(chainId))
    }
  }

  return (
    <Container maxW="100%" w="container.sm" pt="4" pb="8">
      <FormControl mb="4">
        <FormLabel>Safe Address</FormLabel>
        <Select
          onSelect={(event) => setSelectedSafe(event.currentTarget.value)}
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
