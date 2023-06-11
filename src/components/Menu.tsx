import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  Container,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Tab,
  TabIndicator,
  TabList,
  Tabs,
  Text,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { NavLink } from 'react-router-dom'

import { State, useStore } from '../store'

const pages = [
  { to: '/', title: 'Transactions' },
  { to: '/deploy', title: 'Deploy' },
  { to: '/run', title: 'Invoke' },
] as const

function NavItem(props: { to: string; title: string }) {
  const activeColor = useColorModeValue('gray.600', 'blue.300')
  const hoverColor = useColorModeValue('whiteAlpha.800', 'whiteAlpha.700')

  return (
    <NavLink to={props.to}>
      {({ isActive }) => (
        <Text
          css={isActive ? { color: activeColor } : {}}
          _hover={{ color: hoverColor }}
        >
          {props.title}
        </Text>
      )}
    </NavLink>
  )
}

export function Menu() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Container maxW="100%" w="container.lg" pt={3} pb={4}>
      <Flex>
        <Text pr={4} fontSize="2xl">
          Deployer
        </Text>
        <HStack position="relative">
          {pages.map((info) => (
            <NavItem key={info.title} to={info.to} title={info.title} />
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
