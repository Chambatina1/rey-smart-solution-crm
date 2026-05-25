import { PrismaClient } from '@prisma/client'
import { join } from 'path'
import { mkdirSync } from 'fs'

// Ensure DATABASE_URL has a sensible default
if (!process.env.DATABASE_URL) {
  const dbDir = join(process.cwd(), 'db')
  mkdirSync(dbDir, { recursive: true })
  process.env.DATABASE_URL = `file:${join(dbDir, 'crm.db')}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Auto-create tables on startup (non-blocking)
db.$connect().then(async () => {
  try {
    // Try to create tables - ignore if they already exist
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_prisma_migrations" (id TEXT PRIMARY KEY, checksum TEXT, finished_at TEXT, migration_name TEXT, logs TEXT, rolled_back_at TEXT, started_at TEXT, applied_steps_count INTEGER)')
  } catch {
    // Table might already exist - that's fine
  }
}).catch(() => {
  // Connection will be established on first query
})
