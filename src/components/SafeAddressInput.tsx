import {
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  LinkBox,
  LinkOverlay,
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { getAddress, isAddress } from 'viem'
import { useEffect, useState } from 'react'

import * as localStorage from '../utils/localStorage'
import * as query from '../utils/query'
import { useSafeAddressUrl } from '../hooks/safe'
import { useStore } from '../store'

export function SafeAddressInput() {
  const setState = useStore((s) => s.setState)
  const safeAddressUrl = useSafeAddressUrl()
  const [safeAddressValue, setSafeAddressValue] = useState('')

  // Load the safe address from url or local storage
  useEffect(() => {
    const param = query.get('safe') || localStorage.getItem('safe')
    const safeAddress = isAddress(param) ? getAddress(param) : ''
    setSafeAddressValue(safeAddress)
  }, [])

  // If the user puts a correct address in the input, update the url and local storage
  useEffect(() => {
    const safeAddress = isAddress(safeAddressValue)
      ? getAddress(safeAddressValue)
      : ''
    query.set('safe', safeAddress)
    localStorage.setItem('safe', safeAddress)
    setState({ safeAddress })
  }, [safeAddressValue])

  return (
    <Container maxW="100%" w="container.sm" pt="4" pb="8">
      <FormControl mb="4">
        <FormLabel>Safe Address</FormLabel>
        <InputGroup>
          <Input
            placeholder="0x000..."
            variant="filled"
            value={safeAddressValue}
            onChange={(evt) => setSafeAddressValue(evt.target.value)}
          />
          {safeAddressUrl && (
            <InputRightElement>
              <LinkBox>
                <LinkOverlay href={safeAddressUrl} isExternal>
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
