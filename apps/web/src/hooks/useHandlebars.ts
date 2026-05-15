import { useState, useEffect, useRef } from 'react'
import Handlebars from 'handlebars'

const SIZE_THRESHOLD = 50_000
const DEBOUNCE_MS = 500

export function useHandlebars(template: string, jsonStr: string) {
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [needsManual, setNeedsManual] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const process = () => {
    try {
      const data = JSON.parse(jsonStr || '{}')
      const compiled = Handlebars.compile(template)
      setResult(compiled(data))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    const combined = template.length + jsonStr.length
    if (combined > SIZE_THRESHOLD) {
      setNeedsManual(true)
      return
    }
    setNeedsManual(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(process, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [template, jsonStr])

  return { result, error, needsManual, process }
}
