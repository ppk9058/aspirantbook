"use client"

import { useState, useCallback, useMemo, useTransition } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export interface TableControlOptions {
  defaultPageSize?: number
  defaultSortField?: string
  defaultSortOrder?: "asc" | "desc"
}

export function useTableControls(options: TableControlOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const defaultPageSize = options.defaultPageSize || 10
  const defaultSortField = options.defaultSortField || "createdAt"
  const defaultSortOrder = options.defaultSortOrder || "desc"

  const search = searchParams.get("q") || ""
  const sortField = searchParams.get("sort") || defaultSortField
  const sortOrder = (searchParams.get("order") as "asc" | "desc") || defaultSortOrder
  const page = parseInt(searchParams.get("page") || "1", 10) || 1
  const pageSize = parseInt(searchParams.get("pageSize") || String(defaultPageSize), 10) || defaultPageSize

  const updateUrl = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === "" || value === undefined) {
          current.delete(key)
        } else {
          current.set(key, value)
        }
      }

      startTransition(() => {
        router.replace(`${pathname}?${current.toString()}`, { scroll: false })
      })
    },
    [router, pathname, searchParams]
  )

  const setSearch = useCallback(
    (q: string) => {
      updateUrl({ q: q.trim() ? q : null, page: "1" })
    },
    [updateUrl]
  )

  const setFilter = useCallback(
    (filterName: string, value: string | null) => {
      updateUrl({ [filterName]: value && value !== "ALL" ? value : null, page: "1" })
    },
    [updateUrl]
  )

  const setSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        updateUrl({ order: sortOrder === "asc" ? "desc" : "asc", page: "1" })
      } else {
        updateUrl({ sort: field, order: "desc", page: "1" })
      }
    },
    [sortField, sortOrder, updateUrl]
  )

  const setPage = useCallback(
    (newPage: number) => {
      updateUrl({ page: String(Math.max(1, newPage)) })
    },
    [updateUrl]
  )

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }, [router, pathname])

  const getFilter = useCallback(
    (filterName: string, defaultValue = "ALL"): string => {
      return searchParams.get(filterName) || defaultValue
    },
    [searchParams]
  )

  return {
    search,
    setSearch,
    sortField,
    sortOrder,
    setSort,
    page,
    pageSize,
    setPage,
    getFilter,
    setFilter,
    clearAllFilters,
  }
}
