import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('public mobile account routes reuse hardened web handlers', () => {
  const routes = ['captcha', 'register', 'forgot-password', 'reset-password']
  for (const name of routes) {
    const route = readFileSync(`src/pages/api/mobile/v1/auth/${name}.ts`, 'utf8')
    assert.match(route, /export \{ default \} from/)
  }
})

test('mobile family management requires bearer identity and owner authorization', () => {
  const inviteList = readFileSync('src/pages/api/mobile/v1/family/invites/index.ts', 'utf8')
  const inviteDetail = readFileSync('src/pages/api/mobile/v1/family/invites/[id].ts', 'utf8')
  const member = readFileSync('src/pages/api/mobile/v1/family/members/[id].ts', 'utf8')
  for (const route of [inviteList, inviteDetail, member]) {
    assert.match(route, /requireMobileIdentity/)
    assert.match(route, /OWNER|Owner role required/)
    assert.doesNotMatch(route, /getServerSession|authOptions/)
  }
  assert.match(member, /detachUserFromHouseholds/)
  assert.match(member, /reconcileActiveHousehold/)
  assert.match(inviteList, /consumeInviteEmailAttempt/)
})

test('mobile note attachments validate authorization, size, and file signatures', () => {
  const route = readFileSync('src/pages/api/mobile/v1/notes/attachments.ts', 'utf8')
  assert.match(route, /requireMobileIdentity/)
  assert.match(route, /MAX_BYTES = 3 \* 1024 \* 1024/)
  assert.match(route, /imageType\(bytes\)/)
  assert.match(route, /collaborators: \{ some: \{ userId, role: 'EDITOR'/)
  assert.doesNotMatch(route, /getServerSession|authOptions/)
})

test('mobile navigation has six primary destinations and a restricted rich editor', () => {
  const layout = readFileSync('apps/mobile/app/(app)/_layout.tsx', 'utf8')
  for (const title of ['Home', 'Plan', 'Shop', 'Finance', 'Notes', 'Health']) assert.match(layout, new RegExp(`title: '${title}'`))
  assert.match(layout, /name="household" options=\{\{ href: null \}\}/)
  assert.match(layout, /name="chores" options=\{\{ href: null \}\}/)
  assert.match(layout, /name="meals" options=\{\{ href: null \}\}/)
  const editor = readFileSync('apps/mobile/src/RichNoteEditor.tsx', 'utf8')
  assert.match(editor, /Content-Security-Policy/)
  assert.match(editor, /originWhitelist=\{\['about:blank'\]\}/)
  assert.match(editor, /onShouldStartLoadWithRequest/)
  assert.match(editor, /toggleChecklist/)
  assert.match(editor, /data-type="taskList"/)
  assert.match(editor, /injectedJavaScript=\{serializer\}/)
  assert.match(editor, /source=\{source\}/)
  assert.match(editor, /Keeping its source stable avoids/)
  assert.doesNotMatch(editor, /<script>\$\{serializer\}<\/script>/)
  assert.match(editor, /taskList=document\.createElement\('ul'\)/)
  assert.match(editor, /taskList\.dataset\.type='taskList'/)
  const notes = readFileSync('apps/mobile/app/(app)/notes.tsx', 'utf8')
  assert.match(notes, /Animated\.timing/)
  assert.match(notes, /SharingToggle/)
  assert.match(notes, /editing: false/)
  assert.match(notes, /label="Edit"/)
  assert.match(notes, /RichNoteView/)
  assert.match(notes, /RichNotePreview/)
  const viewer = readFileSync('apps/mobile/src/RichNoteView.tsx', 'utf8')
  assert.match(viewer, /node\.type === 'taskList'/)
  assert.match(viewer, /item\.attrs\?\.checked === true/)
  assert.match(viewer, /export function RichNotePreview/)
  assert.match(editor, /attrs:\{checked:/)
})
