import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['tests/official.live.ts'], testTimeout: 45000 } })
