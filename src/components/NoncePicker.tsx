import _ from 'lodash'

import {
  Box,
  Checkbox,
  Code,
  Container,
  FormControl,
  FormLabel,
  HStack,
  Input,
  ListItem,
  UnorderedList,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Address } from 'viem'
import { useSafeTransactions } from '../hooks/backend'
import { SafeDefinition, useStore } from '../store'

export default function NoncePicker(props: {
  safe?: SafeDefinition
  onPickedNonce: (nonce: number | null) => void
}) {
  const currentSafe = useStore((s) => s.currentSafe)

  const [isCustomNonce, setUseCustomNonce] = useState(false)

  const [pickedNonce, pickNonce] = useState<number | null>(null)

  const { nonce, staged, stagedQuery } = useSafeTransactions(
    props.safe || currentSafe
  )

  const lastNonce = staged.length
    ? _.last(staged).txn._nonce
    : Number(nonce) - 1

  if (stagedQuery.isSuccess && pickedNonce === null) {
    // default to last nonce--this effectively allows for overriding the most recently staged txn
    pickNonce(lastNonce)
    props.onPickedNonce(Number(lastNonce) + 1)
  }

  return (
    <FormControl mb={4}>
      <HStack>
        <Checkbox
          disabled={!staged?.length}
          isChecked={isCustomNonce}
          onChange={(e) => {
            props.onPickedNonce(e.target.checked ? pickedNonce : lastNonce + 1)
            setUseCustomNonce(e.target.checked)
          }}
        >
          Override Previously Staged Txn
        </Checkbox>
        {isCustomNonce && (
          <NumberInput
            min={Number(nonce)}
            max={lastNonce}
            value={pickedNonce}
            onChange={(n) => {
              pickNonce(parseInt(n))
              return props.onPickedNonce(parseInt(n))
            }}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        )}
      </HStack>
    </FormControl>
  )
}
