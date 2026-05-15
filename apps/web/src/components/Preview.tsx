interface Props {
  html: string
  error: string | null
}

export function Preview({ html, error }: Props) {
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-destructive font-mono text-sm bg-destructive/10 border border-destructive/30 rounded p-4 w-full">
          <p className="font-semibold mb-1">Erro</p>
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={html}
      sandbox="allow-same-origin"
      className="h-full w-full border-0 bg-white"
      title="Preview"
    />
  )
}
