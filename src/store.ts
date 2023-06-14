import { create } from 'zustand'
import { BuildState } from './hooks/cannon'

export interface State {
  safeAddress: string
  build: {
    cid: string
    preset: string
    buildState: BuildState
  }
}

export interface Actions {
  setState: (state: Partial<State>) => void
  setBuildState: (state: Partial<State['build']>) => void
}

export type Store = State & Actions

const initialState = {
  safeAddress: '',
  build: {
    cid: '',
    preset: 'main',
    buildState: {
      status: 'idle',
      message: '',
    },
  },
} satisfies State

const useStore = create<Store>()((set) => ({
  ...initialState,
  setState: (newState) => set(newState),
  setBuildState: (newState) =>
    set((state) => ({ ...state, build: { ...state.build, ...newState } })),
}))

export { useStore }
