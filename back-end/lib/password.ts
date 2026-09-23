import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const saltLength = 16
const keyLength = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(saltLength).toString("hex")
  const hash = scryptSync(password, salt, keyLength).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, storedHash] = storedPassword.split(":")

  if (!salt || !storedHash) return false

  const calculatedHash = scryptSync(password, salt, keyLength)
  const expectedHash = Buffer.from(storedHash, "hex")

  return expectedHash.length === calculatedHash.length && timingSafeEqual(calculatedHash, expectedHash)
}