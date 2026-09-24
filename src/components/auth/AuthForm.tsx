'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AfraMark } from '@/components/shared/AfraLogo'
import { Spinner } from '@/components/shared/Spinner'

export function AuthForm({ mode, googleEnabled }: { mode: 'sign-in' | 'sign-up'; googleEnabled: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/${isSignUp ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSignUp ? { email, password, name: name || undefined } : { email, password }),
      })
      const body = (await res.json()) as { error?: { message: string } }
      if (!res.ok) throw new Error(body.error?.message ?? 'Something went wrong.')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="AFRA home">
            <span className="flex flex-col items-center gap-3 text-afra-white">
              <AfraMark size={44} />
              <span className="text-xs font-medium tracking-[0.42em] text-afra-muted">CREATE IN 3D</span>
            </span>
          </Link>
        </div>

        <h1 className="text-center text-lg font-semibold">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1.5 text-center text-sm text-afra-muted">
          {isSignUp ? 'Start designing in 3D in under a minute.' : 'Sign in to continue creating.'}
        </p>

        <form onSubmit={submit} className="mt-7 flex flex-col gap-3">
          {isSignUp && (
            <div>
              <label className="label mb-1.5 block" htmlFor="name">
                Name <span className="normal-case text-afra-muted/60">(optional)</span>
              </label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada" autoComplete="name" maxLength={80} />
            </div>
          )}
          <div>
            <label className="label mb-1.5 block" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" autoComplete="email" />
          </div>
          <div>
            <label className="label mb-1.5 block" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={isSignUp ? 8 : undefined}
            />
          </div>

          {error && (
            <div className="rounded-md border border-[rgba(224,82,82,0.4)] bg-[rgba(224,82,82,0.08)] px-3 py-2 text-xs text-afra-danger" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2 h-10 w-full text-sm">
            {loading ? <Spinner size={14} /> : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-afra-muted">
              <span className="h-px flex-1 bg-afra-border" /> or <span className="h-px flex-1 bg-afra-border" />
            </div>
            <a href="/api/auth/google/start" className="btn-outline h-10 w-full text-sm">
              <GoogleIcon /> Continue with Google
            </a>
          </>
        )}

        <p className="mt-6 text-center text-xs text-afra-muted">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <Link href="/sign-in" className="text-afra-orange hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to AFRA?{' '}
              <Link href="/sign-up" className="text-afra-orange hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2.1 3.7-5.1 3.7-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.8 3C3.2 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-3.9-3C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l3.9-3z" />
      <path fill="#EA4335" d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l3.9 3c1-2.9 3.7-5 6.9-5z" />
    </svg>
  )
}
