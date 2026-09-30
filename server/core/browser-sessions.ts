import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { Db } from 'mongodb'
import { hashToken } from './mongo-database'
export type Credential = 'qroke_guest' | 'qroke_admin' | 'qroke_youtube'
export type Membership = {
  _id: string
  browserHash: string
  organizationId: string
  partyId: string
  scope: string
  role: 'owner' | 'guest'
  version: number
  expiresAt: Date
  credentials: Partial<Record<Credential, string>>
}
export class BrowserSessions {
  private key: Buffer
  constructor(
    public db: Db,
    encryptionKey: string,
  ) {
    this.key = Buffer.from(encryptionKey, 'hex')
    if (this.key.length !== 32) throw new Error('Chave de sessão inválida.')
  }
  id(browser: string, scope: string) {
    return hashToken(browser) + ':' + scope
  }
  async get(browser: string, scope: string) {
    return this.db
      .collection<Membership>('memberships')
      .findOne({ _id: this.id(browser, scope), expiresAt: { $gt: new Date() } })
  }
  async grant(browser: string, input: Omit<Membership, '_id' | 'browserHash' | 'credentials'>) {
    const id = this.id(browser, input.scope)
    await this.db.collection<Membership>('memberships').updateOne(
      { _id: id },
      [
        {
          $set: {
            ...Object.fromEntries(
              Object.entries(input).map(([key, value]) => [key, { $literal: value }]),
            ),
            browserHash: hashToken(browser),
            credentials: { $ifNull: ['$credentials', {}] },
            // An invite opened while the same browser enters its PIN must not downgrade ownership.
            role: {
              $cond: [
                { $and: [{ $eq: ['$role', 'owner'] }, { $gt: ['$expiresAt', new Date()] }] },
                'owner',
                input.role,
              ],
            },
            version: {
              $cond: [
                { $and: [{ $eq: ['$role', 'owner'] }, { $gt: ['$expiresAt', new Date()] }] },
                0,
                input.version,
              ],
            },
          },
        },
      ],
      { upsert: true },
    )
    return (await this.get(browser, input.scope))!
  }
  read(row: Membership, kind: Credential) {
    const raw = row.credentials[kind]
    if (!raw) return undefined
    const data = Buffer.from(raw, 'base64')
    const cipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12))
    cipher.setAAD(Buffer.from(row._id + ':' + kind))
    cipher.setAuthTag(data.subarray(-16))
    return Buffer.concat([cipher.update(data.subarray(12, -16)), cipher.final()]).toString()
  }
  async set(row: Membership, kind: Credential, value?: string) {
    let encoded: string | undefined
    if (value) {
      const iv = randomBytes(12),
        cipher = createCipheriv('aes-256-gcm', this.key, iv)
      cipher.setAAD(Buffer.from(row._id + ':' + kind))
      encoded = Buffer.concat([
        iv,
        cipher.update(value),
        cipher.final(),
        cipher.getAuthTag(),
      ]).toString('base64')
    }
    const changed = await this.db
      .collection<Membership>('memberships')
      .updateOne(
        { _id: row._id, expiresAt: { $gt: new Date() } },
        encoded
          ? { $set: { ['credentials.' + kind]: encoded } }
          : { $unset: { ['credentials.' + kind]: '' } },
      )
    if (!changed.matchedCount) throw new Error('Acesso expirado.')
    if (encoded) row.credentials[kind] = encoded
    else delete row.credentials[kind]
  }
}
