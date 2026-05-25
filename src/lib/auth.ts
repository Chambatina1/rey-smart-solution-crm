import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'rey-smart-solution-dev-secret-key-2024'

const secretKey = new TextEncoder().encode(JWT_SECRET)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function signToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as { userId: string; email: string; role: string }
  } catch {
    return null
  }
}

export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

// FREE ACCESS MODE - No auth required. Returns a default admin user for all requests.
// TODO: Re-enable authentication when ready for production
export async function getAuthUser(request: NextRequest): Promise<{ userId: string; email: string; role: string } | null> {
  // Bypass auth - always return admin access
  return { userId: 'demo-admin', email: 'admin@reysmartsolution.com', role: 'admin' }
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}
