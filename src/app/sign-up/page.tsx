import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata = { title: 'Create account' }

export default async function SignUpPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  return <AuthForm mode="sign-up" googleEnabled={googleEnabled} />
}
