import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

export function validatePassword(password: string): { ok: boolean; message?: string } {
  if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }
  if (password.length > 128) return { ok: false, message: 'Password is too long.' }
  return { ok: true }
}
