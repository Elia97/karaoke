import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth'

export const Route = createFileRoute('/host')({ component: HostLayout })

function HostLayout() {
  const navigate = useNavigate()
  const [state, setState] = useState<'loading' | 'authed' | 'anon'>('loading')

  useEffect(() => {
    let cancelled = false
    authClient.getSession().then((res) => {
      if (cancelled) return
      const data = (res as { data?: { user?: unknown } | null }).data
      setState(data?.user ? 'authed' : 'anon')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (state === 'anon') {
      void navigate({ to: '/host/login' })
    }
  }, [state, navigate])

  if (state === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </main>
    )
  }
  if (state === 'anon') return null
  return <Outlet />
}
