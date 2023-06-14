import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  Container,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { NavLink } from 'react-router-dom'

const pages = [
  { to: '/', title: 'Transactions' },
  { to: '/build', title: 'Build' },
  { to: '/deploy', title: 'Deploy' },
  { to: '/run', title: 'Invoke' },
] as const

function NavItem({ to, title }: { to: string; title: string }) {
  const activeColor = useColorModeValue('blue.600', 'blue.300')
  const hoverColor = useColorModeValue('gray.400', 'whiteAlpha.700')

  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <Text
          color={isActive && activeColor}
          _hover={!isActive && { color: hoverColor }}
        >
          {title}
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
