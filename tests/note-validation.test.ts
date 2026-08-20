import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateContentJson,
  validateNoteColor,
  validateOptionalBoolean,
  validateOptionalText,
} from '../src/lib/note-validation'

test('note validation accepts supported values', () => {
  assert.equal(validateNoteColor('yellow'), null)
  assert.equal(validateNoteColor(undefined), null)
  assert.equal(validateOptionalBoolean(false, 'flag'), null)
  assert.equal(validateOptionalText('hello', 'Content', 20), null)
  assert.equal(validateContentJson({ type: 'doc', content: [] }), null)
})

test('note validation rejects malformed and oversized values', () => {
  assert.match(validateNoteColor('script') || '', /Invalid note color/)
  assert.match(validateOptionalBoolean('false', 'flag') || '', /true or false/)
  assert.match(validateOptionalText('too long', 'Content', 3) || '', /3 characters/)
  assert.match(validateContentJson('not-json-object') || '', /JSON object/)
  assert.match(validateContentJson({ body: 'x'.repeat(500_001) }) || '', /too large/)
})

test('note validation rejects unsafe links and event attributes', () => {
  assert.match(
    validateContentJson({ type: 'doc', content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }) || '',
    /unsafe link/,
  )
  assert.match(
    validateContentJson({ type: 'doc', attrs: { onload: 'alert(1)' } }) || '',
    /unsafe attribute/,
  )
  assert.equal(
    validateContentJson({ type: 'doc', content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }] }),
    null,
  )
})
