import _ from 'lodash'

import { ethers } from 'ethers'

import { Button, FormControl, Spinner, Text } from '@chakra-ui/react'
import { useCannonPackage } from '../hooks/cannon'

import { useAccount, useChainId, useMutation, useWalletClient } from 'wagmi'
import { useStore } from '../store'

import {
  CannonStorage,
  FallbackRegistry,
  InMemoryRegistry,
  OnChainRegistry,
  copyPackage,
} from '@usecannon/builder'
import { IPFSBrowserLoader } from '../utils/ipfs'

export default function PublishUtility(props: {
  deployUrl: string
  targetVariant: string
}) {
  const settings = useStore((s) => s.settings)

  const wc = useWalletClient()
  const account = useAccount()

  // get the package referenced by this ipfs package
  const {
    resolvedName,
    resolvedVersion,
    ipfsQuery: ipfsPkgQuery,
  } = useCannonPackage('@' + props.deployUrl.replace('://', ':'))

  // then reverse check the package referenced by the
  const {
    pkgUrl: existingRegistryUrl,
    registryQuery,
    ipfsQuery: ipfsChkQuery,
  } = useCannonPackage(
    `${resolvedName}:${resolvedVersion}`,
    props.targetVariant
  )

  const publishMutation = useMutation({
    mutationFn: async () => {
      console.log(
        'publish triggered',
        wc,
        resolvedName,
        resolvedVersion,
        props.targetVariant
      )

      const targetRegistry = new OnChainRegistry({
        signerOrProvider: new ethers.providers.Web3Provider(
          wc.data as any
        ).getSigner(account.address),
        address: settings.registryAddress,
      })

      const fakeLocalRegistry = new InMemoryRegistry()
      // TODO: set meta url
      fakeLocalRegistry.publish(
        [`${resolvedName}:${resolvedVersion}`],
        props.targetVariant,
        props.deployUrl,
        ''
      )

      const loader = new IPFSBrowserLoader(
        settings.ipfsUrl || 'https://ipfs.io/ipfs/'
      )

      const fromStorage = new CannonStorage(
        new FallbackRegistry([fakeLocalRegistry, targetRegistry]),
        { ipfs: loader },
        'ipfs'
      )
      const toStorage = new CannonStorage(
        targetRegistry,
        { ipfs: loader },
        'ipfs'
      )

      await copyPackage({
        packageRef: `${resolvedName}:${resolvedVersion}`,
        tags: settings.publishTags.split(','),
        variant: props.targetVariant,
        fromStorage,
        toStorage,
        recursive: true,
      })
    },
    onSuccess() {
      registryQuery.refetch()
    },
  })

  // any difference means that this deployment is not technically published
  if (ipfsPkgQuery.isFetching || ipfsChkQuery.isFetching) {
    return <Text>Loading...</Text>
  } else if (existingRegistryUrl !== props.deployUrl) {
    return (
      <FormControl mb="8">
        {!existingRegistryUrl ? (
          <Text color={'red'} mb={3}>
            Not Deployed to Registry
          </Text>
        ) : (
          <Text color={'yellow'} mb={3}>
            Different Deployment Published to this version on the Registry
          </Text>
        )}
        <Button
          isDisabled={wc.data?.chain?.id !== 1 || publishMutation.isLoading}
          onClick={() => publishMutation.mutate()}
        >
          {publishMutation.isLoading
            ? [<Spinner />, ' Publish in Progress...']
            : 'Publish to Registry'}
        </Button>
      </FormControl>
    )
  } else {
    return (
      <FormControl mb="8">
        <Text color={'green'}>Deployed to Registry</Text>
      </FormControl>
    )
  }
}
