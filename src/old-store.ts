import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deepmerge } from 'deepmerge-ts'
import { BuildState } from './hooks/cannon'

export interface State {
  page: 'build' | 'settings' | 'history'
  packageRef: string
  preset: string
  buildState: BuildState
  settings: {
    ipfsUrl: string
    forkProviderUrl: string
    registryAddress: string
    registryProviderUrl: string
    publishTags: string
  }
}

export interface Actions {
  setState: (state: Partial<State>) => void
  setBuildState: (build: State['buildState']) => void
  setSettings: (settings: Partial<State['settings']>) => void
}

export type Store = State & Actions

const initialState = {
  page: 'build',
  packageRef: '',
  preset: 'main',
  buildState: {
    status: 'idle',
    message: '',
  },
  settings: {
    ipfsUrl: '',
    forkProviderUrl: '',
    registryAddress: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
    registryProviderUrl:
      'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7',
    publishTags: 'latest',
  },
} satisfies State

const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,
      setState: (newState) => set(newState),
      setBuildState: (build) => set({ buildState: build }),
      setSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    }),
    // Persist only settings on local storage
    {
      name: 'cannon-state',
      partialize: (state) => ({ settings: state.settings }),
      merge: (persisted, initial) => deepmerge(initial, persisted) as Store,
    }
  )
)

export { useStore }
