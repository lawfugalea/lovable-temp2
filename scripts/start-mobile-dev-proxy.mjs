import http from 'node:http'
import process from 'node:process'

const listenPort = Number.parseInt(process.env.CLANKEEP_MOBILE_PROXY_PORT || '3002', 10)
const apiPort = Number.parseInt(process.env.CLANKEEP_MOBILE_API_PORT || '3001', 10)

if (!Number.isInteger(listenPort) || !Number.isInteger(apiPort)) {
  console.error('Mobile proxy and API ports must be integers.')
  process.exit(1)
}

function isAllowedPath(rawUrl = '/') {
  try {
    const { pathname } = new URL(rawUrl, 'http://localhost')
    return pathname === '/api/health' || pathname.startsWith('/api/mobile/v1/')
  } catch {
    return false
  }
}

const server = http.createServer((request, response) => {
  if (!isAllowedPath(request.url)) {
    response.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const headers = {
    accept: request.headers.accept || 'application/json',
    host: `127.0.0.1:${apiPort}`,
    'user-agent': request.headers['user-agent'] || 'Clankeep mobile tunnel',
  }
  for (const name of ['authorization', 'content-length', 'content-type', 'cf-connecting-ip']) {
    const value = request.headers[name]
    if (value) headers[name] = value
  }

  const upstream = http.request({
    hostname: '127.0.0.1',
    port: apiPort,
    path: request.url,
    method: request.method,
    headers,
  }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, {
      ...upstreamResponse.headers,
      'cache-control': 'no-store',
    })
    upstreamResponse.pipe(response)
  })

  upstream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    }
    response.end(JSON.stringify({ error: 'Mobile API unavailable' }))
  })
  request.pipe(upstream)
})

server.requestTimeout = 15_000
server.headersTimeout = 20_000
server.listen(listenPort, '127.0.0.1', () => {
  console.log(`Restricted mobile proxy listening on http://127.0.0.1:${listenPort}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
