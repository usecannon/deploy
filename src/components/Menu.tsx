import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  Link,
  HStack,
  IconButton,
  Text,
  useColorMode,
  useColorModeValue,
  Tag,
} from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { SettingsIcon } from '@chakra-ui/icons'
import { NavLink, useLocation } from 'react-router-dom'
import { some, omit } from 'lodash'

import { useStore } from '../store'

const pages = [
  { to: '/', title: 'Sign Transactions' },
  { to: '/transactions', title: 'Queue Transactions' },
  { to: '/gitops', title: 'Queue From GitOps' },
] as const

function NavItem({ to, title }: { to: string; title: string }) {
  const currentSafe = useStore((s) => s.currentSafe)
  const activeColor = useColorModeValue('blue.600', 'blue.300')
  const hoverColor = useColorModeValue('gray.400', 'whiteAlpha.700')

  const link =
    currentSafe && to !== '/settings'
      ? `${to}?chainId=${currentSafe.chainId}&address=${currentSafe.address}`
      : to

  return (
    <NavLink to={link}>
      {({ isActive }) => (
        <Text
          fontWeight="semibold"
          mx="4"
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
  const { colorMode } = useColorMode()
  const location = useLocation()
  const settings = useStore((s) => s.settings)

  const missingSettings = some(
    omit(settings, 'forkProviderUrl'),
    (value) => !value
  )

  const showSettingsAlert =
    (location.pathname.includes('/transactions') ||
      location.pathname.includes('/gitops')) &&
    missingSettings

  return (
    <Box mb="6">
      <Flex
        p={4}
        bg={colorMode === 'dark' ? 'blackAlpha.400' : 'blackAlpha.100'}
      >
        <Text fontSize="26.5px" fontWeight="semibold">
          Cannon Deployer
        </Text>
        <Tag
          ml="3"
          size="sm"
          height="24px"
          my="auto"
          variant="outline"
          opacity="0.75"
        >
          Beta
        </Tag>
        <Flex ml="auto">
          <ConnectButton />
          <NavLink to="/settings">
            <IconButton
              ml="3"
              variant={'ghost'}
              aria-label="settings"
              icon={<SettingsIcon />}
            />
          </NavLink>
        </Flex>
      </Flex>
      <Flex
        bg={colorMode === 'dark' ? 'blackAlpha.500' : 'blackAlpha.200'}
        p="3"
        borderTop="1px solid"
        borderBottom="1px solid"
        borderTopColor={
          colorMode === 'dark' ? 'whiteAlpha.100' : 'blackAlpha.50'
        }
        borderBottomColor={
          colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.50'
        }
      >
        <HStack mx="auto">
          {pages.map((info) => (
            <NavItem key={info.title} to={info.to} title={info.title} />
          ))}
        </HStack>
      </Flex>
      {showSettingsAlert && (
        <Alert status="error">
          <Flex mx="auto">
            <AlertIcon />
            You must{' '}
            <Link
              mx="1"
              fontWeight="medium"
              textDecoration="underline"
              as={NavLink}
              to="/settings"
            >
              update your settings
            </Link>{' '}
            to queue transactions.
          </Flex>
        </Alert>
      )}
    </Box>
  )
}
