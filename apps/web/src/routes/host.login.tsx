import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { authClient } from '../lib/auth'

export const Route = createFileRoute('/host/login')({ component: HostLogin })

function HostLogin() {
  function onGoogleSignIn() {
    void authClient.signIn.social({
      provider: 'google',
      callbackURL: '/host',
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <span className="text-5xl">🎧</span>
          <h1 className="text-2xl font-bold">Accedi come DJ</h1>
          <p className="text-sm text-muted-foreground">
            Il tuo account ti permette di gestire il catalogo brani e creare
            sessioni di karaoke.
          </p>
        </header>
        <Button onClick={onGoogleSignIn} className="w-full" size="lg">
          Continua con Google
        </Button>
      </div>
    </main>
  )
}
