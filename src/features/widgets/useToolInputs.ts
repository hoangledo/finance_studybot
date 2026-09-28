import { useEffect, useRef, useState } from 'react'
import { db } from '../../db/db'

/**
 * Inputs for a Money Lab tool. With `persist`, they're saved to this identity's database
 * (`meta` → `tool:<id>`, so they sync with the account) and restored next time.
 * Lessons use the tools without `persist`, so everyone sees the same teaching defaults.
 */
export function useToolInputs<T extends Record<string, unknown>>(id: string, defaults: T, persist = false) {
  const [values, setValues] = useState<T>(defaults)
  const [loaded, setLoaded] = useState(!persist)
  const dirty = useRef(false)

  useEffect(() => {
    if (!persist) return
    let cancelled = false
    db.meta.get(`tool:${id}`).then((row) => {
      if (cancelled) return
      if (row?.value && !dirty.current) setValues({ ...defaults, ...(row.value as Partial<T>) })
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, persist])

  useEffect(() => {
    if (!persist || !loaded || !dirty.current) return
    const t = setTimeout(() => db.meta.put({ key: `tool:${id}`, value: values }), 400)
    return () => clearTimeout(t)
  }, [values, id, persist, loaded])

  const set = (patch: Partial<T>) => {
    dirty.current = true
    setValues((v) => ({ ...v, ...patch }))
  }
  const reset = () => set(defaults)
  const isDefault = JSON.stringify(values) === JSON.stringify(defaults)
  return { values, set, reset, isDefault }
}
