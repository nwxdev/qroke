import { spawn } from 'node:child_process'
const scripts = [
  'browser-access-check.mjs',
  'browser-multisession-check.mjs',
  'browser-check.mjs',
  'browser-player-check.mjs',
  'browser-autostart-check.mjs',
  'browser-layout-check.mjs',
  'browser-theme-check.mjs',
  'browser-menu-check.mjs',
  'browser-playlists-check.mjs',
  'browser-social-check.mjs',
  'browser-playback-check.mjs',
  'browser-replay-check.mjs',
  'browser-karaoke-check.mjs',
  'browser-playlist-items-check.mjs',
]
const failed = []
for (const script of scripts) {
  console.log('\nExecutando ' + script)
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/' + script], {
      stdio: 'inherit',
      env: process.env,
    })
    child.once('error', () => resolve(1))
    child.once('exit', (code) => resolve(code ?? 1))
  })
  if (code) failed.push(script)
}
console.log(
  '\nNavegador: ' + (scripts.length - failed.length) + '/' + scripts.length + ' scripts aprovados.',
)
if (failed.length) console.error('Falharam: ' + failed.join(', '))
process.exitCode = failed.length ? 1 : 0
