import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Text,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { parseIpfsHash } from '../utils/ipfs'

interface Props {
  initialValue: string
  isLoading?: boolean
  onChange?: (val: string) => void
}

export function CIDInput({ initialValue = '', onChange, isLoading }: Props) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    const cid = parseIpfsHash(value)
    if (cid) setValue(cid)
    if (onChange) onChange(cid)
  }, [value])

  return (
    <FormControl isRequired>
      <FormLabel>Partial Cannon Deployment IPFS Hash</FormLabel>
      <InputGroup>
        <InputLeftAddon children="@ipfs:" />
        <Input
          name="cid"
          value={value}
          placeholder="Qm..."
          onChange={(evt) => setValue(evt.target.value)}
          isInvalid={!!value && !parseIpfsHash(value)}
        />
        {isLoading && (
          <InputRightAddon children={<Button isLoading variant="ghost" />} />
        )}
      </InputGroup>
      <FormHelperText>
        After running a build using the Cannon CLI, any remaining transactions
        that must be executed with this tool can be staged by providing the IPFS
        hash of the partial deployment data.
      </FormHelperText>
    </FormControl>
  )
}
