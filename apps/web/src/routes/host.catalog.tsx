import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { env } from '../lib/env'

export const Route = createFileRoute('/host/catalog')({
  component: CatalogUpload,
})

type ImportSource = 'json' | 'virtualdj-xml'

function CatalogUpload() {
  const [source, setSource] = useState<ImportSource>('virtualdj-xml')
  const [content, setContent] = useState('')
  const [replace, setReplace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${env.serverUrl}/api/catalog/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, content, replace }),
      })
      const json = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' ? json.error : 'Import failed',
        )
      }
      setResult(
        `Importati ${json.imported as number} brani (skipped ${json.skipped as number}). Totale ora: ${json.total as number}.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File) {
    const text = await file.text()
    setContent(text)
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 bg-background p-8 text-foreground">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Catalogo brani</h1>
        <Button asChild variant="ghost" size="sm">
          <Link to="/host">Indietro</Link>
        </Button>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Formato</label>
          <div className="flex gap-2">
            {(['virtualdj-xml', 'json'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  source === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                {s === 'virtualdj-xml' ? 'VirtualDJ database.xml' : 'JSON'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">File</label>
          <input
            type="file"
            accept={source === 'virtualdj-xml' ? '.xml' : '.json'}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Contenuto (auto-popolato dal file)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder={
              source === 'virtualdj-xml'
                ? '<VirtualDJ_Database>...</VirtualDJ_Database>'
                : '[{ "title": "...", "artist": "...", "filename": "..." }]'
            }
            className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="size-4"
          />
          Sostituisci catalogo esistente (cancella tutti i brani precedenti)
        </label>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || !content}>
            {busy ? 'Importazione...' : 'Importa'}
          </Button>
          {result && <p className="text-sm text-muted-foreground">{result}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </main>
  )
}
