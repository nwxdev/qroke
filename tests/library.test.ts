import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Library, byteRange } from '../server/core/library'
describe('biblioteca local', () => {
  it('serve intervalos normais e suffix, rejeita inválidos', () => {
    expect(byteRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 })
    expect(byteRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 })
    expect(byteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    for (const range of ['bytes=100-', 'bytes=9-1', 'bytes=-0', 'bytes=0-2,5-9', 'bytes=-', 'oops'])
      expect(() => byteRange(range, 100)).toThrow()
  })
  it('indexa recursivamente, ignora links e não aceita paths arbitrários', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qroke-lib-'))
    try {
      await mkdir(join(dir, 'album'))
      await writeFile(join(dir, 'album', 'Artista - Faixa.mp3'), 'music')
      await writeFile(join(dir, 'secret.txt'), 'secret')
      await symlink(join(dir, 'secret.txt'), join(dir, 'escape.mp3'))
      const lib = new Library(dir)
      await lib.scan()
      const tracks = lib.search('faixa')
      expect(tracks).toHaveLength(1)
      expect(tracks[0]?.artist).toBe('Artista')
      expect(await lib.file('../secret.txt')).toBeUndefined()
      expect((await lib.file(tracks[0]!.id))?.size).toBe(5)
    } finally {
      await rm(dir, { recursive: true })
    }
  })
})
