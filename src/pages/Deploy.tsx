import {
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Box,
  Heading,
  Button,
  Text,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react'
import { Transaction } from '../components/Transaction'
import GitReadFileInput from '../components/GitReadFileInput'
import { parseDiff, Diff, Hunk } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import { useEffect, useState } from 'react'

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
      <Tabs isFitted>
        <TabList>
          <Tab>Deploy from GitHub</Tab>
          <Tab>Complete Partial Deployment</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <FormControl mb="4">
              <FormLabel>GitHub URL</FormLabel>
              <Input type="text" />
              <FormHelperText>
                Enter the GitHub URL for branch of the GitOps repository to
                deploy. You will able to execute the transactions you are
                permitted to and queue the rest.
              </FormHelperText>
            </FormControl>

            <Box mb="6">git diff here</Box>

            <Box mb="6">
              <Heading size="sm">Transactions to Queue</Heading>
              <Transaction modalDisplay />
              <Button w="100%">Add to Queue</Button>
            </Box>
          </TabPanel>

          <TabPanel>
            <FormControl mb="4">
              <FormLabel>Partial Cannon Deployment IPFS Hash</FormLabel>
              <Input type="text" />
              <FormHelperText>
                After running a build using the Cannon CLI, any remaining
                transactions that must be executed with this tool can be staged
                by providing the IPFS hash of the partial deployment data.
              </FormHelperText>
            </FormControl>

            <Box mb="6">
              <Heading size="sm">Transactions to Queue</Heading>
              <Transaction modalDisplay isExecutable />
              <Transaction modalDisplay />
              <Button w="100%">Add to Queue</Button>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}
