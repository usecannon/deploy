import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deepmerge } from 'deepmerge-ts'
import { Address } from 'viem'
import deepEqual from 'fast-deep-equal'
import uniqWith from 'lodash/uniqWith'

import { BuildState } from './hooks/cannon'
import { chains } from './constants'
import { includes } from './utils/array'

export type ChainId = (typeof chains)[number]['id']

export type SafeDefinition = {
  chainId: ChainId
  address: Address
}

export interface State {
  currentSafe: SafeDefinition | null
  safeAddresses: SafeDefinition[]
  build: {
    cid: string
    buildState: BuildState
  }
  settings: {
    ipfsUrl: string
    stagingUrl: string
    publishTags: string
    preset: string
    registryAddress: string
    registryProviderUrl: string
    forkProviderUrl: string
  }
}

export interface Actions {
  setState: (state: Partial<State>) => void
  setBuild: (state: Partial<State['build']>) => void
  setSettings: (state: Partial<State['settings']>) => void
  setCurrentSafe: (state: State['currentSafe']) => void
  prependSafeAddress: (state: State['currentSafe']) => void
}

export type Store = State & Actions

const initialState = {
  currentSafe: null,
  safeAddresses: [],
  build: {
    cid: '',
    buildState: {
      status: 'idle',
      message: '',
    },
  },
  settings: {
    ipfsUrl: '',
    stagingUrl: 'http://127.0.0.1:3000',
    publishTags: 'latest',
    preset: 'main',
    registryAddress: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
    registryProviderUrl: '',
    forkProviderUrl: '',
  },
} satisfies State

const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,
      setState: (newState) => set(newState),
      setBuild: (newState) =>
        set((state) => ({ ...state, build: { ...state.build, ...newState } })),
      setSettings: (newState) =>
        set((state) => ({
          ...state,
          settings: { ...state.settings, ...newState },
        })),
      setCurrentSafe: (currentSafe) => {
        set((state) => {
          const newState = { ...state, currentSafe }

          if (!includes(state.safeAddresses, currentSafe)) {
            newState.safeAddresses = [currentSafe, ...newState.safeAddresses]
          }

          return newState
        })
      },
      prependSafeAddress: (newAddress) => {
        set((state) => ({
          ...state,
          safeAddresses: uniqWith(
            [newAddress, ...state.safeAddresses],
            deepEqual
          ),
        }))
      },
    }),
    // Persist only settings and safe addresses on local storage
    {
      name: 'cannon-state',
      partialize: (state) => ({
        settings: state.settings,
        safeAddresses: state.safeAddresses,
      }),
      merge: (persisted, initial) => deepmerge(initial, persisted) as Store,
    }
  )
)

export { useStore }
