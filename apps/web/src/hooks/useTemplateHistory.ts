import { useCallback, useRef, useState } from 'react'

export function useTemplateHistory(initial: string) {
  const [template, setTemplateState] = useState(initial)
  const history = useRef<string[]>([initial])
  const cursor = useRef(0)

  const setTemplate = useCallback((next: string) => {
    history.current = history.current.slice(0, cursor.current + 1)
    history.current.push(next)
    cursor.current = history.current.length - 1
    setTemplateState(next)
  }, [])

  const undo = useCallback(() => {
    if (cursor.current <= 0) return
    cursor.current -= 1
    setTemplateState(history.current[cursor.current])
  }, [])

  const redo = useCallback(() => {
    if (cursor.current >= history.current.length - 1) return
    cursor.current += 1
    setTemplateState(history.current[cursor.current])
  }, [])

  const canUndo = cursor.current > 0
  const canRedo = cursor.current < history.current.length - 1

  return { template, setTemplate, undo, redo, canUndo, canRedo }
}
