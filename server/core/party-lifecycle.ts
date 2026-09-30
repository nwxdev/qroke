import { createError } from 'h3'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { PartyInfo } from '../../shared/parties'
export const PARTY_LIFETIME = 24 * 60 * 60 * 1000
export interface PartyDetails {
  partyId: string
  name?: string
  pinHash?: string
  createdAt?: Date
  expiresAt?: Date
  closedAt?: Date
  purgeAt?: Date
  creationKey?: string
  createdBy?: string
}
export function partyInfo(row: PartyDetails, now = Date.now()): PartyInfo {
  return {
    id: row.partyId,
    name: row.name || 'Festa original',
    createdAt: row.createdAt?.getTime() || null,
    expiresAt: row.expiresAt?.getTime() || null,
    closedAt: row.closedAt?.getTime() || null,
    status: row.closedAt
      ? 'closed'
      : row.expiresAt && row.expiresAt.getTime() <= now
        ? 'expired'
        : 'active',
  }
}
export function assertPartyActive(row: PartyDetails, now = Date.now()) {
  if (partyInfo(row, now).status !== 'active')
    throw createError({ statusCode: 410, statusMessage: 'Esta festa foi encerrada.' })
}
function derive(pin: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(pin, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 48 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  )
}
export async function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex')
  return 'scrypt$' + salt + '$' + (await derive(pin, salt)).toString('hex')
}
export async function checkPin(pin: string, encoded: string) {
  const [kind, salt, hash] = encoded.split('$')
  if (kind !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{64}$/.test(hash || ''))
    return false
  return timingSafeEqual(await derive(pin, salt!), Buffer.from(hash!, 'hex'))
}
