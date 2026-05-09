import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-background p-8 text-foreground">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="text-6xl">🎤</span>
        <h1 className="text-5xl font-bold tracking-tight">Karaoke</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Coda live per il karaoke. I partecipanti richiedono brani col codice
          della sessione, il DJ gestisce la coda dal pannello.
        </p>
      </header>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/join">Sono partecipante</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/host">Sono il DJ</Link>
        </Button>
      </div>
    </main>
  )
}
