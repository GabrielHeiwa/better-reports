import { useState } from 'react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { CodeEditor } from '@/components/CodeEditor'
import { Preview } from '@/components/Preview'
import { Chat } from '@/components/Chat'
import { PdfConfigForm } from '@/components/PdfConfigForm'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useHandlebars } from '@/hooks/useHandlebars'
import { useTemplateHistory } from '@/hooks/useTemplateHistory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_PDF_CONFIG } from '@/types/pdf-config'
import type { PdfConfig } from '@/types/pdf-config'

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <p>{{description}}</p>
  <ul>
    {{#each items}}
    <li>{{this}}</li>
    {{/each}}
  </ul>
</body>
</html>`

const DEFAULT_JSON = `{
  "title": "Hello, Better Reports!",
  "description": "Edit the template and parameters to see the result.",
  "items": ["Item A", "Item B", "Item C"]
}`

export default function App() {
  const [savedTemplate] = useLocalStorage('br-template', DEFAULT_TEMPLATE)
  const [jsonStr, setJsonStr] = useLocalStorage('br-json', DEFAULT_JSON)
  const [pdfConfig, setPdfConfig] = useLocalStorage<PdfConfig>('br-pdf-config', DEFAULT_PDF_CONFIG)
  const { template, setTemplate, undo, redo, canUndo, canRedo } = useTemplateHistory(savedTemplate)
  const { result, error, needsManual, process } = useHandlebars(template, jsonStr)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleGeneratePdf() {
    setPdfLoading(true)
    try {
      const res = await fetch('http://localhost:3000/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, parameters: JSON.parse(jsonStr || '{}'), options: pdfConfig }),
      })
      if (!res.ok) throw new Error(`Erro ${res.status}: ${await res.text()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pdfConfig.filename || 'report'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao gerar PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="dark h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Better Reports</span>
          <Badge variant="secondary" className="text-xs">Editor</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} title="Desfazer">
            ↩
          </Button>
          <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} title="Refazer">
            ↪
          </Button>
          {needsManual && (
            <Button size="sm" variant="secondary" onClick={process}>
              Processar
            </Button>
          )}
          <Button size="sm" onClick={handleGeneratePdf} disabled={pdfLoading}>
            {pdfLoading ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal" className="h-full">
          {/* Col esquerda 60%: HTML editor + JSON */}
          <Panel defaultSize={60} minSize={30}>
            <PanelGroup orientation="vertical" className="h-full">
              <Panel defaultSize={60} minSize={20}>
                <div className="h-full flex flex-col border-r border-border">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30 shrink-0">
                    HTML Template
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor value={template} onChange={setTemplate} language="html" />
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />
              <Panel defaultSize={40} minSize={15}>
                <div className="h-full flex flex-col border-r border-border overflow-hidden">
                  <Tabs defaultValue="params" className="h-full flex flex-col">
                    <TabsList className="shrink-0 w-full rounded-none border-b border-border bg-muted/30 justify-start px-2 h-8">
                      <TabsTrigger value="params" className="text-xs h-6">Parâmetros</TabsTrigger>
                      <TabsTrigger value="pdf" className="text-xs h-6">Config PDF</TabsTrigger>
                      <TabsTrigger value="chat" className="text-xs h-6">Assistente IA</TabsTrigger>
                    </TabsList>
                    <TabsContent value="params" className="flex-1 overflow-hidden mt-0">
                      <CodeEditor value={jsonStr} onChange={setJsonStr} language="json" />
                    </TabsContent>
                    <TabsContent value="pdf" className="flex-1 overflow-hidden mt-0">
                      <PdfConfigForm config={pdfConfig} onChange={setPdfConfig} />
                    </TabsContent>
                    <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                      <Chat template={template} parameters={jsonStr} onApplyTemplate={setTemplate} />
                    </TabsContent>
                  </Tabs>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

          {/* Col direita 40%: Preview full height */}
          <Panel defaultSize={40} minSize={20}>
            <div className="h-full flex flex-col">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30 shrink-0">
                Preview
              </div>
              <div className="flex-1 overflow-hidden">
                <Preview html={result} error={error} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
