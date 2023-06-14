import { create } from 'zustand'

export interface State {
  safeAddress: string
}

export interface Actions {
  setState: (state: Partial<State>) => void
}

export type Store = State & Actions

const initialState = {
  safeAddress: '',
} satisfies State

const useStore = create<Store>()((set) => ({
  ...initialState,
  setState: (newState) => set(newState),
}))

export { useStore }
