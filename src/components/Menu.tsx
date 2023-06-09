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
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'

import { State, useStore } from '../store'

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
    <Container maxW="100%" w="container.lg" pt={3} pb={4}>
      <Flex>
        <Text pr={4} fontSize="2xl">
          Deployer
        </Text>
        <Tabs
          position="relative"
          variant="unstyled"
          isManual
          index={pages.findIndex((page) => page === currentPage)}
          onChange={(index) => setState({ page: pages[index] })}
        >
          <TabList>
            {pages.map((page, index) => (
              <Tab
                key={page}
                css={{ cursor: 'pointer' }}
                _hover={{
                  color: 'whiteAlpha.800',
                  _dark: { color: 'whiteAlpha.700' },
                }}
                _selected={{
                  color: 'blue.600',
                  _dark: { color: 'blue.300' },
                }}
              >
                {titles[index]}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <Spacer />
        <ConnectButton />
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
