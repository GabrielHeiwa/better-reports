import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  template: string
  parameters: string
  onApplyTemplate: (html: string) => void
}

function extractHtmlBlock(text: string): string | null {
  const match = text.match(/```html\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

export function Chat({ template, parameters, onApplyTemplate }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    const userMessage: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)

    let params: Record<string, unknown> = {}
    try { params = JSON.parse(parameters || '{}') } catch {}

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...nextMessages, assistantMessage])

    try {
      const res = await fetch('http://localhost:3000/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, template, parameters: params }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.token) {
              fullText += parsed.token
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText }
                return updated
              })
            }
          } catch {}
        }
      }

      const html = extractHtmlBlock(fullText)
      if (html) onApplyTemplate(html)
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Erro: ${e instanceof Error ? e.message : 'falha na requisição'}`,
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30 shrink-0">
        Assistente IA
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Descreva o que quer mudar no template...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'text-right'
                : 'text-left text-muted-foreground'
            }`}
          >
            <span
              className={`inline-block px-3 py-2 rounded-lg max-w-[90%] whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="p-2 border-t border-border flex gap-2 shrink-0">
        <textarea
          className="flex-1 resize-none bg-muted rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none min-h-[60px]"
          placeholder="Mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          disabled={streaming}
        />
        <Button size="sm" onClick={send} disabled={streaming || !input.trim()} className="self-end">
          {streaming ? '...' : 'Enviar'}
        </Button>
      </div>
    </div>
  )
}
