import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['tests/official.live.ts', 'tests/playlists.live.ts'], testTimeout: 45000 },
})
