import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata = { title: 'Sign in' }

export default async function SignInPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  return <AuthForm mode="sign-in" googleEnabled={googleEnabled} />
}
