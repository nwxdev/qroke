import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: [
      'tests/youtube-key.live.ts',
      'tests/official.live.ts',
      'tests/playlists.live.ts',
      'tests/radio.live.ts',
    ],
    testTimeout: 45000,
  },
})
