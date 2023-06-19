import 'react-diff-view/style/index.css'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import { useEffect, useState } from 'react'

import GitReadFileInput from '../components/GitReadFileInput'
import { Transaction } from '../components/Transaction'

export function Deploy() {
  const [diffText, setDiffText] = useState('')

  useEffect(() => {
    // Replace this with the diff you want to display.
    // For example, it could be fetched from an API.
    const diff = `
          diff --git a/file1 b/file2
          index 1111111..2222222 100644
          --- a/file1
          +++ b/file2
          @@ -1,3 +1,9 @@
          -test
          +another test
          +lines
          +in
          +the
          +diff
      `

    setDiffText(diff)
  }, [])

  const files = parseDiff(diffText)

  return (
    <Container maxW="100%" w="container.sm">
      {/*
    <GitReadFileInput
      repo="https://github.com/Synthetixio/synthetix-deployments.git"
      branch="main"
      filepath="omnibus-mainnet.toml"
    />
    */}


    <FormControl mb="4">
      <FormLabel>Git Repo URL</FormLabel>
      <HStack>
        <Input type="text" placeholder="https://github.com/myorg/myrepo" />
        <Input type="text" placeholder="cannonfile.toml" />
      </HStack>
      <FormHelperText>
        Enter the GitHub URL for branch of the GitOps repository to
        deploy. You will able to execute the transactions you are
        permitted to and queue the rest.
      </FormHelperText>
    </FormControl>

    <FormControl mb="4">
      <FormLabel>Branch</FormLabel>
      <HStack>
        <Select>
          <option value=""></option>
        </Select>
      </HStack>
      <FormHelperText>
        If you don't want to deploy from the default branch. Cannon will automatically detect the previous release.
      </FormHelperText>
    </FormControl>

    {/* TODO: insert/load override settings here */}

    <FormControl mb="4">
      <FormLabel>Optional Partial Deploy</FormLabel>
      <Input type="text" />
      <FormHelperText>
        If the deployment you are executing required executing some transactions outside the safe (ex. contract deployments,
        transactions requiring permission of EOA), please supply the IPFS hash here.
      </FormHelperText>
    </FormControl>

    <Box mb="6">git diff here</Box>

    <Box mb="6">
      <Button w="100%">Add to Queue</Button>
    </Box>

    </Container>
  )
}
