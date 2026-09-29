import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { ClientSession, Db } from 'mongodb'
import { hashToken } from './mongo-database'

export interface AsyncStore<T> {
  get(key: string): Promise<T | undefined>
  set(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  take(key: string): Promise<T | undefined>
  replaceIfPresent(key: string, value: T): Promise<boolean>
  size(): Promise<number>
}
export class MemoryStore<T extends { expires: number }> implements AsyncStore<T> {
  private values = new Map<string, T>()
  constructor(private now = Date.now) {}
  async get(key: string) {
    const value = this.values.get(key)
    if (value && value.expires > this.now()) return value
    this.values.delete(key)
    return undefined
  }
  async set(key: string, value: T) {
    this.values.set(key, value)
  }
  async delete(key: string) {
    this.values.delete(key)
  }
  async take(key: string) {
    const value = await this.get(key)
    this.values.delete(key)
    return value
  }
  async replaceIfPresent(key: string, value: T) {
    if (!this.values.has(key)) return false
    this.values.set(key, value)
    return true
  }
  async size() {
    return this.values.size
  }
}
type SecretRow = { _id: string; scope: string; kind: string; data: string; expiresAt: Date }
export class EncryptedStore<T extends { expires: number }> implements AsyncStore<T> {
  private key: Buffer
  constructor(
    private db: Db,
    private scope: string,
    private kind: string,
    encryptionKey: string,
  ) {
    this.key = Buffer.from(encryptionKey, 'hex')
    if (this.key.length !== 32)
      throw new Error('QROKE_ENCRYPTION_KEY deve conter 32 bytes em hexadecimal.')
  }
  private id(value: string) {
    return this.scope + ':' + this.kind + ':' + hashToken(value)
  }
  private encrypt(value: T) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key, iv)
    cipher.setAAD(Buffer.from(this.scope + ':' + this.kind))
    return Buffer.concat([
      iv,
      cipher.update(JSON.stringify(value)),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString('base64')
  }
  private decrypt(row: SecretRow | null): T | undefined {
    if (!row || row.expiresAt.getTime() <= Date.now()) return undefined
    const data = Buffer.from(row.data, 'base64'),
      decipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12))
    decipher.setAAD(Buffer.from(this.scope + ':' + this.kind))
    decipher.setAuthTag(data.subarray(-16))
    return JSON.parse(
      Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString(),
    ) as T
  }
  async get(key: string, session?: ClientSession) {
    return this.decrypt(
      await this.db.collection<SecretRow>('oauth').findOne({ _id: this.id(key) }, { session }),
    )
  }
  async set(key: string, value: T, session?: ClientSession) {
    await this.db.collection<SecretRow>('oauth').replaceOne(
      { _id: this.id(key) },
      {
        scope: this.scope,
        kind: this.kind,
        data: this.encrypt(value),
        expiresAt: new Date(value.expires),
      },
      { upsert: true, session },
    )
  }
  async delete(key: string) {
    await this.db.collection<SecretRow>('oauth').deleteOne({ _id: this.id(key) })
  }
  async take(key: string) {
    return this.decrypt(
      await this.db.collection<SecretRow>('oauth').findOneAndDelete({ _id: this.id(key) }),
    )
  }
  async replaceIfPresent(key: string, value: T) {
    return (
      (
        await this.db.collection<SecretRow>('oauth').updateOne(
          { _id: this.id(key), expiresAt: { $gt: new Date() } },
          {
            $set: { data: this.encrypt(value), expiresAt: new Date(value.expires) },
          },
        )
      ).matchedCount === 1
    )
  }
  async size() {
    return this.db
      .collection<SecretRow>('oauth')
      .countDocuments({ scope: this.scope, kind: this.kind, expiresAt: { $gt: new Date() } })
  }
}
