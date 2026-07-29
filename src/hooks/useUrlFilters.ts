/**
 * Filter state that lives in the URL.
 *
 * Every view is then a link: shareable, bookmarkable, and browser-back walks the
 * drilldown rather than leaving the page. Values equal to their default are kept
 * out of the query string so a plain `/banking/analytics` stays plain, and
 * anything unparseable is dropped in a single normalising replace rather than one
 * per keystroke.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import type { ParsedUrlQueryInput } from 'node:querystring'

export type FilterField<V> = {
  default: V
  /** Return null to reject a value; it is then dropped and the default used. */
  parse: (raw: string) => V | null
  serialize?: (value: V) => string
}

export type FilterSpec<T> = { [K in keyof T]: FilterField<T[K]> }

function readValue<T, K extends keyof T>(spec: FilterSpec<T>, key: K, raw: unknown): { value: T[K]; valid: boolean } {
  const field = spec[key]
  if (typeof raw !== 'string' || raw === '') return { value: field.default, valid: raw === undefined }
  const parsed = field.parse(raw)
  return parsed === null ? { value: field.default, valid: false } : { value: parsed, valid: true }
}

function toQuery<T extends object>(spec: FilterSpec<T>, values: T, rest: ParsedUrlQueryInput): ParsedUrlQueryInput {
  const query: ParsedUrlQueryInput = { ...rest }
  for (const key of Object.keys(spec) as Array<keyof T>) {
    const field = spec[key]
    const value = values[key]
    if (value === field.default) {
      delete query[key as string]
      continue
    }
    query[key as string] = field.serialize ? field.serialize(value) : String(value)
  }
  return query
}

function sameQuery(left: ParsedUrlQueryInput, right: ParsedUrlQueryInput): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every(key => String(left[key]) === String(right[key]))
}

export function useUrlFilters<T extends Record<string, string | number>>(
  spec: FilterSpec<T>,
): {
  filters: T
  setFilters: (patch: Partial<T>, options?: { history?: 'push' | 'replace' }) => void
  ready: boolean
} {
  const router = useRouter()
  const keys = Object.keys(spec) as Array<keyof T>

  const filters = {} as T
  let needsNormalising = false
  const rest: ParsedUrlQueryInput = {}
  for (const [queryKey, raw] of Object.entries(router.query)) {
    if (!keys.includes(queryKey as keyof T) && raw !== undefined) rest[queryKey] = raw
  }
  for (const key of keys) {
    const { value, valid } = readValue(spec, key, router.query[key as string])
    filters[key] = value
    // A value that parsed but equals the default is redundant in the URL; an
    // invalid one is noise. Both get cleaned up in the same pass.
    if (!valid || (router.query[key as string] !== undefined && value === spec[key].default)) {
      needsNormalising = true
    }
  }

  useEffect(() => {
    if (!router.isReady || !needsNormalising) return
    const next = toQuery(spec, filters, rest)
    if (sameQuery(next, router.query as ParsedUrlQueryInput)) return
    void router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true, scroll: false })
    // The spec is a literal defined at module scope; re-running on every render
    // would fight the replace it just issued.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, needsNormalising, JSON.stringify(router.query)])

  /**
   * A filter change is navigation: it pushes, so browser-back undoes it and
   * walks back up a drilldown rather than leaving the page. Only the tidy-up
   * above replaces, since nobody should have to press back through a URL they
   * never chose.
   */
  const setFilters = (patch: Partial<T>, options: { history?: 'push' | 'replace' } = {}) => {
    const next = { ...filters, ...patch }
    const url = { pathname: router.pathname, query: toQuery(spec, next, rest) }
    void (options.history === 'replace'
      ? router.replace(url, undefined, { shallow: true, scroll: false })
      : router.push(url, undefined, { shallow: true, scroll: false }))
  }

  return { filters, setFilters, ready: router.isReady }
}

/** Convenience builders for the common field kinds. */
export const filterField = {
  oneOf<V extends string>(options: readonly V[], fallback: V): FilterField<V> {
    return {
      default: fallback,
      parse: raw => (options as readonly string[]).includes(raw) ? raw as V : null,
    }
  },
  numberOneOf(options: readonly number[], fallback: number): FilterField<number> {
    return {
      default: fallback,
      parse: raw => {
        const value = Number(raw)
        return options.includes(value) ? value : null
      },
    }
  },
  text(fallback = ''): FilterField<string> {
    return {
      default: fallback,
      parse: raw => raw.slice(0, 120),
    }
  },
}
