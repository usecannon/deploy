import {
  Text,
  Flex,
  Tab,
  TabIndicator,
  TabList,
  Tabs,
  Spacer,
  Container,
  IconButton,
  useColorMode,
} from '@chakra-ui/react'

import { State, useStore } from '../store'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'

const pages = [
  'transactions',
  'deploy',
] as const satisfies readonly State['page'][]
const titles = ['Transactions', 'Deploy'] as const

export function Menu() {
  const currentPage = useStore((s) => s.page)
  const setState = useStore((s) => s.setState)
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Container maxW="100%" w="container.sm" pr="0.4" paddingY={4}>
      <Flex>
        <Text fontSize="2xl">Synthetix Deployer</Text>
        <Spacer />
        <Tabs
          position="relative"
          variant="unstyled"
          index={pages.findIndex((page) => page === currentPage)}
          onChange={(index) => setState({ page: pages[index] })}
        >
          <TabList>
            {pages.map((page, index) => (
              <Tab key={page} css={{ cursor: 'pointer' }}>
                {titles[index]}
              </Tab>
            ))}
          </TabList>
          <TabIndicator
            mt="-1.5px"
            height="2px"
            bg="blue.500"
            borderRadius="1px"
          />
        </Tabs>
        <IconButton
          variant={'ghost'}
          aria-label="color mode"
          icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          onClick={toggleColorMode}
        />
      </Flex>
    </Container>
  )
}
