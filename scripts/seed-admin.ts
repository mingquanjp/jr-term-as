import { randomBytes, randomUUID } from 'node:crypto'

import bcrypt from 'bcryptjs'

import { readUsers, writeUsers, type StoredUser } from '../server/auth/userStore.js'

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@jr-term.local')
    .trim()
    .toLocaleLowerCase('en-US')
  const password =
    process.env.ADMIN_PASSWORD ?? `${randomBytes(12).toString('base64url')}A1!`
  if (password.length < 12)
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.')

  const users = await readUsers()
  const existing = users.find((user) => user.email === email)
  const admin: StoredUser = {
    id: existing?.id ?? randomUUID(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  const nextUsers = [...users.filter((user) => user.email !== email), admin]
  await writeUsers(nextUsers)

  console.log(`ADMIN_EMAIL=${email}`)
  console.log(`ADMIN_PASSWORD=${password}`)
}

seedAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Admin seeding failed.')
  process.exitCode = 1
})
