import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'

const root = new URL('..', import.meta.url)
const mobile = new URL('../apps/mobile/', import.meta.url)
const publicUrl = process.env.CLANKEEP_MOBILE_PUBLIC_URL || 'https://clankeep-dev.217-160-174-130.sslip.io'

if (!process.env.CLANKEEP_ENV_FILE) {
  console.error('CLANKEEP_ENV_FILE must point to the ignored server environment file.')
  process.exit(1)
}

const mobileRequire = createRequire(new URL('../apps/mobile/package.json', import.meta.url))
const expoBin = mobileRequire.resolve('expo/bin/cli')
const serviceEnv = { ...process.env, CLANKEEP_MOBILE_API_PORT: process.env.CLANKEEP_MOBILE_API_PORT || '3001', CLANKEEP_MOBILE_PROXY_PORT: process.env.CLANKEEP_MOBILE_PROXY_PORT || '3012', CLANKEEP_MOBILE_GATEWAY_PORT: process.env.CLANKEEP_MOBILE_GATEWAY_PORT || '3013', CLANKEEP_METRO_PORT: process.env.CLANKEEP_METRO_PORT || '8081' }
const children = [
  spawn(process.execPath, ['scripts/start-mobile-dev-api.mjs'], { cwd: root, env: serviceEnv, stdio: 'inherit' }),
  spawn(process.execPath, ['scripts/start-mobile-dev-proxy.mjs'], { cwd: root, env: serviceEnv, stdio: 'inherit' }),
  spawn(process.execPath, ['scripts/start-mobile-dev-gateway.mjs'], { cwd: root, env: serviceEnv, stdio: 'inherit' }),
  spawn(process.execPath, [expoBin, 'start', '--clear', '--host', 'lan'], {
    cwd: mobile,
    env: { ...serviceEnv, EXPO_PUBLIC_API_URL: publicUrl, EXPO_PACKAGER_PROXY_URL: publicUrl },
    stdio: 'inherit',
  }),
]

console.log(`Permanent Expo Go URL: exp://${new URL(publicUrl).host}`)
console.log('The public gateway permits only Expo traffic, /api/mobile/v1/*, and /api/health.')

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (!child.killed) child.kill('SIGTERM')
  setTimeout(() => process.exit(code), 1_000).unref()
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop())
for (const child of children) child.on('exit', code => { if (!stopping && code) stop(code) })
