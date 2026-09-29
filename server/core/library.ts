import { readdir, realpath, stat } from 'node:fs/promises'
import { basename, extname, join, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
import type { Track } from '../../shared/types'
export class Library {
  files = new Map<string, { path: string; track: Track }>()
  root = ''
  constructor(public configuredRoot: string) {}
  async scan() {
    this.files.clear()
    if (!this.configuredRoot) return
    this.root = await realpath(this.configuredRoot)
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) await walk(path)
        else if (entry.isFile() && /\.(mp3|flac|m4a|ogg|wav)$/i.test(entry.name)) {
          const id = createHash('sha256')
            .update(relative(this.root, path))
            .digest('hex')
            .slice(0, 32)
          const stem = basename(path, extname(path)),
            parts = stem.split(' - ')
          this.files.set(id, {
            path,
            track: {
              id,
              source: 'local',
              title: parts.length > 1 ? parts.slice(1).join(' - ') : stem,
              artist: parts.length > 1 ? parts[0]! : 'Biblioteca local',
              duration: 0,
              thumbnail: '',
              karaoke: false,
            },
          })
        }
      }
    }
    await walk(this.root)
  }
  search(query: string) {
    const q = query.toLocaleLowerCase('pt-BR')
    return [...this.files.values()]
      .map((f) => f.track)
      .filter((t) => (t.title + ' ' + t.artist).toLocaleLowerCase('pt-BR').includes(q))
      .slice(0, 100)
  }
  async file(id: string) {
    const file = this.files.get(id)
    if (!file) return
    const path = await realpath(file.path)
    const rel = relative(this.root, path)
    if (rel.startsWith('..') || isAbsolute(rel)) return
    return { ...file, path, size: (await stat(path)).size }
  }
}
export function byteRange(header: string | undefined, size: number) {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!m || (!m[1] && !m[2]) || size <= 0) throw new Error('Invalid range')
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
  const end = m[1] ? (m[2] ? Math.min(Number(m[2]), size - 1) : size - 1) : size - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw new Error('Invalid range')
  return { start, end }
}
