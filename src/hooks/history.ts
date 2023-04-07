import { ItemBase, useDb, useItemsList } from './db'

const DATABASE_NAME = 'cannon-history'

export interface HistoryItem extends ItemBase {
  preset: string
  chainId: number
  safeAddress: string
}

export function useHistory() {
  return useDb<HistoryItem>(DATABASE_NAME)
}

export function useHistoryList() {
  return useItemsList<HistoryItem>(DATABASE_NAME)
}
