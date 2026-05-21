import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import { config } from '../config/index.js'

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10)
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, config.jwt.secret as string, {
    expiresIn: config.jwt.expiry,
  } as any)
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, config.jwt.secret) as Record<string, unknown>
  } catch {
    return null
  }
}
