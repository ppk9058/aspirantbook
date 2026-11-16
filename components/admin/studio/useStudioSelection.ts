"use client"

import { useState, useCallback, useMemo } from "react"

export interface UseStudioSelectionOptions<T> {
  items: T[]
  getItemId: (item: T) => string
}

export function useStudioSelection<T>({
  items,
  getItemId,
}: UseStudioSelectionOptions<T>) {
  const [selectedIdSet, setSelectedIdSet] = useState<Set<string>>(new Set())

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId])

  const selectedIds = useMemo(() => Array.from(selectedIdSet), [selectedIdSet])

  const selectedCount = selectedIdSet.size

  const allSelected = useMemo(() => {
    if (itemIds.length === 0) return false
    return itemIds.every((id) => selectedIdSet.has(id))
  }, [itemIds, selectedIdSet])

  const isPartiallySelected = selectedCount > 0 && !allSelected

  const isSelected = useCallback(
    (id: string) => selectedIdSet.has(id),
    [selectedIdSet]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIdSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(
    (checked?: boolean) => {
      setSelectedIdSet((prev) => {
        const shouldSelectAll = checked !== undefined ? checked : !allSelected
        if (shouldSelectAll) {
          return new Set(itemIds)
        } else {
          return new Set()
        }
      })
    },
    [allSelected, itemIds]
  )

  const clearSelection = useCallback(() => {
    setSelectedIdSet(new Set())
  }, [])

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIdSet.has(getItemId(item)))
  }, [items, selectedIdSet, getItemId])

  return {
    selectedIds,
    selectedIdSet,
    selectedCount,
    allSelected,
    isPartiallySelected,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectedItems,
  }
}

export default useStudioSelection
