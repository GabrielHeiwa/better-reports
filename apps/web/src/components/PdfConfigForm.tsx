import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PdfConfig } from '@/types/pdf-config'

interface Props {
  config: PdfConfig
  onChange: (config: PdfConfig) => void
}

export function PdfConfigForm({ config, onChange }: Props) {
  const set = <K extends keyof PdfConfig>(key: K, value: PdfConfig[K]) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Formato</Label>
          <Select value={config.format} onValueChange={(v) => set('format', v as PdfConfig['format'])}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['A4', 'A3', 'Letter', 'Legal'] as const).map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Orientação</Label>
          <Select
            value={config.landscape ? 'landscape' : 'portrait'}
            onValueChange={(v) => set('landscape', v === 'landscape')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait" className="text-xs">Portrait</SelectItem>
              <SelectItem value="landscape" className="text-xs">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Nome do arquivo</Label>
        <Input
          className="h-8 text-xs"
          value={config.filename}
          onChange={(e) => set('filename', e.target.value)}
          placeholder="report"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Margens</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const).map((key) => (
            <div key={key} className="space-y-1">
              <span className="text-xs text-muted-foreground capitalize">
                {key.replace('margin', '').toLowerCase()}
              </span>
              <Input
                className="h-7 text-xs"
                value={config[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder="1cm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
