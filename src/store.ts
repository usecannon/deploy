import { create } from 'zustand'

export interface State {
  page: 'transactions' | 'deploy'
}

export interface Actions {
  setState: (state: Partial<State>) => void
}

export type Store = State & Actions

const initialState = {
  page: 'transactions',
} satisfies State

const useStore = create<Store>()((set) => ({
  ...initialState,
  setState: (newState) => set(newState),
}))

export { useStore }
