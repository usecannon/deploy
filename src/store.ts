import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deepmerge } from 'deepmerge-ts'
import { BuildState } from './hooks/cannon'
import { Address } from 'viem'

export interface State {
  safeAddresses: { address: Address; chainId: number }[]
  safeIndex: number
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
  setSafeAddresses: (state: Partial<State['safeAddresses']>) => void
}

export type Store = State & Actions

const initialState = {
  safeAddresses: [],
  safeIndex: 0,
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
    registryProviderUrl:
      'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7',
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
      setSafeAddresses: (newState) =>
        set((state) => ({
          ...state,
          safeAddresses: newState,
        })),
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
