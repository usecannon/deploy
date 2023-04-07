import { BrowserLevel } from 'browser-level'
import { sortByProperty } from 'sort-by-property'
import { useEffect, useRef, useState } from 'react'

export interface ItemBase {
  id: string
  createdAt: number
  updatedAt: number
}

const conns = new Map<string, BrowserLevel<string, ItemBase>>()

export function useDb<T extends ItemBase>(listName: string) {
  const [db, setDb] = useState<BrowserLevel<string, T> | null>(null)

  useEffect(() => {
    if (!listName) return

    if (conns.has(listName)) {
      return setDb(conns.get(listName) as BrowserLevel<string, T>)
    }

    const client = new BrowserLevel<string, T>(listName, {
      valueEncoding: 'json',
    })

    conns.set(listName, client)
    setDb(client)
    client.open()
  }, [listName])

  const add = async (val: Omit<T, 'createdAt' | 'updatedAt'>) => {
    if (!db) return
    await db.open()

    const existing = await db.get(val.id).catch(() => null)
    const now = Date.now()

    const item = existing
      ? {
          ...existing,
          ...val,
          updatedAt: now,
        }
      : {
          ...val,
          createdAt: now,
          updatedAt: now,
        }

    return await db.put(val.id, item as T)
  }

  const del = async (id: string) => {
    if (!db) return
    await db.open()
    return await db.del(id)
  }

  return { db, add, del }
}

export function useItemsList<T extends ItemBase>(listName: string) {
  const { db, add, del } = useDb<T>(listName)
  const itemsRef = useRef<T[]>([])
  const [items, setItems] = useState<T[]>([])

  useEffect(() => {
    if (!db) return

    db.on('put', function (id: string, val: T) {
      itemsRef.current.unshift(val)
      setItems([...itemsRef.current])
    })

    db.on('del', function (id: string) {
      removeItem(itemsRef.current, (item) => item.id === id)
      setItems([...itemsRef.current])
    })

    const loadEntries = async () => {
      await db.open()
      const entries = await db.values({ reverse: true }).all()
      itemsRef.current = entries.sort(sortByProperty('updatedAt', 'desc'))
      setItems([...itemsRef.current])
    }

    loadEntries()

    return () => setItems([])
  }, [db])

  return {
    add,
    del,
    items,
  }
}

function removeItem<T>(items: T[], comparator: (item: T) => boolean): void {
  const index = items.findIndex((item) => comparator(item))
  if (index === -1) return
  items.splice(index, 1)
}
