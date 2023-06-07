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

export function Deploy() {
  return (
    <Container maxW="100%" w="container.sm">
      {/*
    <GitReadFileInput
      repo="https://github.com/Synthetixio/synthetix-deployments.git"
      branch="main"
      filepath="omnibus-mainnet.toml"
    />
    */}
      <Tabs>
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

            <Text mb="4">
              See https://github.com/otakustay/react-diff-view#render-diff-hunks
            </Text>
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
              <Transaction modalDisplay />
              <Button w="100%">Add to Queue</Button>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}
