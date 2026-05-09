import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { authClient } from '../lib/auth'

export const Route = createFileRoute('/host/')({ component: HostDashboard })

function HostDashboard() {
  const navigate = useNavigate()

  async function onSignOut() {
    await authClient.signOut()
    void navigate({ to: '/' })
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 bg-background p-8 text-foreground">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pannello DJ</h1>
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          Esci
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/host/sessions/new"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary"
        >
          <h2 className="text-xl font-semibold">Nuova sessione</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Avvia una nuova serata di karaoke con codice condivisibile.
          </p>
        </Link>
        <Link
          to="/host/catalog"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary"
        >
          <h2 className="text-xl font-semibold">Catalogo brani</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Carica il tuo database VirtualDJ o un JSON di brani.
          </p>
        </Link>
      </section>
    </main>
  )
}
