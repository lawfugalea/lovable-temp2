import http from 'node:http'
import net from 'node:net'
import process from 'node:process'

const listenPort = Number.parseInt(process.env.CLANKEEP_MOBILE_GATEWAY_PORT || '3013', 10)
const metroPort = Number.parseInt(process.env.CLANKEEP_METRO_PORT || '8081', 10)
const restrictedApiPort = Number.parseInt(process.env.CLANKEEP_MOBILE_PROXY_PORT || '3012', 10)

function apiRequest(rawUrl = '/') {
  try {
    const { pathname } = new URL(rawUrl, 'http://localhost')
    return pathname === '/api/health' || pathname.startsWith('/api/mobile/v1/')
  } catch { return false }
}

function blockedApiRequest(rawUrl = '/') {
  try {
    const { pathname } = new URL(rawUrl, 'http://localhost')
    return pathname === '/api' || pathname.startsWith('/api/')
  } catch { return false }
}

function forward(request, response) {
  if (blockedApiRequest(request.url) && !apiRequest(request.url)) {
    response.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const targetPort = apiRequest(request.url) ? restrictedApiPort : metroPort
  const upstream = http.request({ hostname: '127.0.0.1', port: targetPort, path: request.url, method: request.method, headers: { ...request.headers, host: `127.0.0.1:${targetPort}` } }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, { ...upstreamResponse.headers, 'cache-control': apiRequest(request.url) ? 'no-store' : upstreamResponse.headers['cache-control'] || 'no-store' })
    upstreamResponse.pipe(response)
  })
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify({ error: 'Development service unavailable' })) })
  request.pipe(upstream)
}

const server = http.createServer(forward)
server.on('upgrade', (request, socket, head) => {
  const upstream = net.connect(metroPort, '127.0.0.1', () => {
    const headers = Object.entries({ ...request.headers, host: `127.0.0.1:${metroPort}` }).map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\r\n')
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n\r\n`)
    if (head.length) upstream.write(head)
    socket.pipe(upstream).pipe(socket)
  })
  upstream.on('error', () => socket.destroy())
})
server.requestTimeout = 60_000
server.headersTimeout = 65_000
server.listen(listenPort, '127.0.0.1', () => console.log(`Mobile development gateway listening on http://127.0.0.1:${listenPort}`))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
