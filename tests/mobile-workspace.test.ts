import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isMobilePlainDocument, mobilePlainDocument, mobilePlainHtml } from '../src/lib/mobile-notes'

test('mobile plain notes escape HTML and carry an explicit safe editor marker', () => {
  const document = mobilePlainDocument('<script>alert(1)</script>\nSecond')
  assert.equal(isMobilePlainDocument(document), true)
  assert.equal(mobilePlainHtml('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
})

test('mobile note routes require mobile identity and validate rich note content', () => {
  const list = readFileSync('src/pages/api/mobile/v1/notes/index.ts', 'utf8')
  const detail = readFileSync('src/pages/api/mobile/v1/notes/[id].ts', 'utf8')
  for (const route of [list, detail]) { assert.match(route, /requireMobileIdentity/); assert.match(route, /mobileHouseholdAvailable/) }
  assert.match(detail, /isMobilePlainDocument/)
  assert.match(detail, /validateContentJson/)
  assert.match(detail, /Rich note changes require the rich editor/)
  assert.doesNotMatch(`${list}${detail}`, /getServerSession|authOptions/)
})

test('mobile workspace route scopes reads and owner-only household edits', () => {
  const route = readFileSync('src/pages/api/mobile/v1/workspace.ts', 'utf8')
  assert.match(route, /requireMobileIdentity/)
  assert.match(route, /mobileHouseholdAvailable/)
  assert.match(route, /role !== 'OWNER'/)
  assert.doesNotMatch(route, /req\.method === 'DELETE'/)
})
