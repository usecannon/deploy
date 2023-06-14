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
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import * as query from '../utils/query'
import { getSafeAddress, getSafeUrl } from '../hooks/safe'
import { useStore } from '../store'

export function SafeAddressInput() {
  const setState = useStore((s) => s.setState)
  const safeAddress = useStore((s) => s.safeAddress)
  const [safeAddressValue, setSafeAddressValue] = useState('')
  const location = useLocation()

  // Load the safe address from url
  useEffect(() => {
    const loadedSafeAddress = getSafeAddress(query.get('safe')) || safeAddress
    setSafeAddressValue(loadedSafeAddress)
  }, [])

  // If the user puts a correct address in the input, update the url
  useEffect(() => {
    const safeAddress = getSafeAddress(safeAddressValue) || ''
    query.set('safe', safeAddress)
    setState({ safeAddress })
  }, [safeAddressValue, location.pathname])

  return (
    <Container maxW="100%" w="container.sm" pt="4" pb="8">
      <FormControl mb="4">
        <FormLabel>Safe Address</FormLabel>
        <InputGroup>
          <Input
            placeholder="eth:0x000..."
            variant="filled"
            value={safeAddressValue}
            onChange={(evt) => setSafeAddressValue(evt.target.value)}
          />
          {safeAddress && (
            <InputRightElement>
              <LinkBox>
                <LinkOverlay href={getSafeUrl(safeAddress)} isExternal>
                  <IconButton
                    borderLeftRadius="0"
                    variant={'ghost'}
                    aria-label="View Safe"
                    icon={<ExternalLinkIcon />}
                  />
                </LinkOverlay>
              </LinkBox>
            </InputRightElement>
          )}
        </InputGroup>
      </FormControl>
    </Container>
  )
}
