import assert from 'node:assert/strict'
import test from 'node:test'
import { setTaskItemChecked } from '../apps/mobile/src/noteChecklist'

test('mobile checklist updates one task immutably by document path', () => {
  const original = { type: 'doc', content: [{ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Milk' }] }] }, { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bread' }] }] }] }] }
  const updated = setTaskItemChecked(original, [0, 1], true) as typeof original
  assert.notEqual(updated, original)
  assert.equal(original.content[0].content[1].attrs.checked, false)
  assert.equal(updated.content[0].content[0].attrs.checked, false)
  assert.equal(updated.content[0].content[1].attrs.checked, true)
})

test('mobile checklist rejects invalid and non-task paths', () => {
  const document = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'No task' }] }] }
  assert.equal(setTaskItemChecked(document, [0], true), null)
  assert.equal(setTaskItemChecked(document, [9], true), null)
  assert.equal(setTaskItemChecked(document, [], true), null)
})
