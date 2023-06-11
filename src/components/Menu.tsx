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
  HStack,
} from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'

import { State, useStore } from '../store'
import { NavLink } from 'react-router-dom'

const pages = [
  { to: '/', title: 'Transactions' },
  { to: '/deploy', title: 'Deploy' },
  { to: '/run', title: 'Invoke' },
] as const satisfies readonly State['page'][]

function NavItem(props: { to: string, title: string }) {
  return <NavLink
      to={props.to}
    >
      {({ isActive }) => (
        <Text
        css={isActive ? {
          color: 'blue.600',
          _dark: { color: 'blue.300' }
        } : {}}
        _hover={{
          color: 'whiteAlpha.800',
          _dark: { color: 'whiteAlpha.700' },
        }}>{props.title}</Text>
      )}
    </NavLink>
}

export function Menu() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Container maxW="100%" w="container.lg" pt={3} pb={4}>
      <Flex>
        <Text pr={4} fontSize="2xl">
          Deployer
        </Text>
        <HStack
          position="relative"
        >
          {pages.map((info) => (
            <NavItem to={info.to} title={info.title} />
          ))}
        </HStack>
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
