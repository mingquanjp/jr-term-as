import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import bcrypt from 'bcryptjs'

import type { AuthUser } from '../../shared/analysis.js'

export type StoredUser = AuthUser & {
  passwordHash: string
  createdAt: string
}

const usersPath = () => path.resolve(process.env.USERS_FILE ?? 'data/users.json')

export async function readUsers(): Promise<StoredUser[]> {
  try {
    const content = await readFile(usersPath(), 'utf8')
    const users = JSON.parse(content) as StoredUser[]
    return Array.isArray(users) ? users : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function writeUsers(users: StoredUser[]): Promise<void> {
  await writeFile(usersPath(), `${JSON.stringify(users, null, 2)}\n`, 'utf8')
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLocaleLowerCase('en-US')
  const user = (await readUsers()).find(
    (candidate) => candidate.email === normalizedEmail,
  )
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null
  return { id: user.id, email: user.email, role: user.role }
}
