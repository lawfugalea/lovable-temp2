import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'
import dotenv from 'dotenv'

const envFile = process.env.CLANKEEP_ENV_FILE
if (!envFile) {
  console.error('CLANKEEP_ENV_FILE must point to an existing ignored server environment file.')
  process.exit(1)
}

const loaded = dotenv.config({ path: envFile, override: false })
if (loaded.error) {
  console.error('Could not load the configured server environment file.')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')
const port = process.env.CLANKEEP_MOBILE_API_PORT || '3001'
const child = spawn(process.execPath, [nextBin, 'dev', '--webpack', '-H', '127.0.0.1', '-p', port], {
  cwd: new URL('..', import.meta.url),
  env: process.env,
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('exit', code => process.exit(code ?? 1))
