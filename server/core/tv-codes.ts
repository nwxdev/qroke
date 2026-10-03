import { randomInt, createHash } from 'node:crypto'
import { dragonflyConnection } from './connections'
export type TvCode = { organizationId: string; partyId: string; version: number; expires: number }
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const TV_CODE_SECONDS = 300
export class TvCodes {
  constructor(
    private url: string,
    private namespace: string,
  ) {}
  private prefix() {
    return 'qroke:tv:' + this.namespace + ':'
  }
  private key(code: string) {
    return this.prefix() + 'code:' + createHash('sha256').update(code).digest('hex')
  }
  async issue(value: TvCode) {
    const redis = await dragonflyConnection(this.url)
    const partyKey = this.prefix() + 'party:' + value.organizationId + ':' + value.partyId
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('')
      const ttl = Math.max(
        1,
        Math.min(TV_CODE_SECONDS, Math.ceil((value.expires - Date.now()) / 1000)),
      )
      const previous = await redis.get(partyKey)
      const created = await redis.eval(
        `
        if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
        local old = redis.call('GET', KEYS[2])
        if (old or '') ~= ARGV[3] then return -1 end
        if old then redis.call('DEL', KEYS[3]) end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
        redis.call('SET', KEYS[2], KEYS[1], 'EX', ARGV[2])
        return 1`,
        {
          keys: [this.key(code), partyKey, previous || this.prefix() + 'unused'],
          arguments: [JSON.stringify(value), String(ttl), previous || ''],
        },
      )
      if (Number(created) === 1) return code
    }
    throw new Error('Não foi possível gerar um código. Tente novamente.')
  }
  async take(code: string): Promise<TvCode | undefined> {
    const redis = await dragonflyConnection(this.url)
    const raw = await redis.getDel(this.key(code.toUpperCase()))
    if (!raw) return
    const value = JSON.parse(raw) as TvCode
    if (value.expires > Date.now()) return value
  }
}
