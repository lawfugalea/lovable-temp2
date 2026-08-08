import assert from 'node:assert/strict'
import test from 'node:test'
import { faqsFor, generalHelpTopics, helpFaqs, moduleHelp } from '../src/lib/help-content'
import { modules } from '../src/lib/modules'

const ENTITLEMENT_FEATURES = new Set([
  'finance', 'ai', 'pushReminders', 'medicinePdf', 'children', 'priceComparison',
])

test('every module in the registry has help copy', () => {
  // Catches a module being added to modules.ts without anyone writing the copy
  // that /help, the command palette and the first-run empty state all read.
  for (const entry of modules) {
    assert.ok(moduleHelp[entry.key], `no help content for module "${entry.key}"`)
  }
})

test('help content declares no modules that do not exist', () => {
  const known = new Set(modules.map((entry) => entry.key))
  for (const key of Object.keys(moduleHelp)) {
    assert.ok(known.has(key as never), `help content for unknown module "${key}"`)
  }
})

test('each module entry keys itself consistently', () => {
  for (const [key, help] of Object.entries(moduleHelp)) {
    assert.equal(help.key, key)
  }
})

test('module copy is present and the right shape', () => {
  for (const [key, help] of Object.entries(moduleHelp)) {
    assert.ok(help.tagline.trim().length > 0, `${key} needs a tagline`)
    assert.ok(help.summary.trim().length > 0, `${key} needs a summary`)
    assert.ok(help.firstAction.label.trim().length > 0, `${key} needs a first action label`)
    assert.ok(help.firstAction.hint.trim().length > 0, `${key} needs a first action hint`)
    assert.ok(help.keywords.length >= 3, `${key} needs at least three search keywords`)
    assert.ok(
      help.capabilities.length >= 3 && help.capabilities.length <= 5,
      `${key} should list 3-5 capabilities, has ${help.capabilities.length}`,
    )
  }
})

test('gated modules reference a real entitlement feature', () => {
  for (const [key, help] of Object.entries(moduleHelp)) {
    if (help.requiresFeature === undefined) continue
    assert.ok(
      ENTITLEMENT_FEATURES.has(help.requiresFeature),
      `${key} requires unknown feature "${help.requiresFeature}"`,
    )
  }
})

test('the paid areas are actually marked as paid', () => {
  // Regression guard: onboarding used to advertise finance to free households.
  assert.equal(moduleHelp.finances.requiresFeature, 'finance')
  assert.equal(moduleHelp.banking.requiresFeature, 'finance')
  assert.equal(moduleHelp.shopping.requiresFeature, undefined)
  assert.equal(moduleHelp.chores.requiresFeature, undefined)
})

test('FAQ ids are unique', () => {
  const ids = helpFaqs.map((faq) => faq.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('FAQ entries are complete and correctly audienced', () => {
  for (const faq of helpFaqs) {
    assert.ok(faq.question.trim().length > 0, `${faq.id} needs a question`)
    assert.ok(faq.answer.trim().length > 0, `${faq.id} needs an answer`)
    assert.ok(['public', 'app', 'both'].includes(faq.audience), `${faq.id} has a bad audience`)
  }
})

test('faqsFor includes shared entries in both audiences', () => {
  const publicFaqs = faqsFor('public')
  const appFaqs = faqsFor('app')
  assert.ok(publicFaqs.length > 0)
  assert.ok(appFaqs.length > 0)
  // The five original landing questions are marked 'both'.
  assert.ok(publicFaqs.some((faq) => faq.id === 'free'))
  assert.ok(appFaqs.some((faq) => faq.id === 'free'))
  // App-only entries never leak onto the marketing page.
  assert.ok(!publicFaqs.some((faq) => faq.audience === 'app'))
  assert.ok(!appFaqs.some((faq) => faq.audience === 'public'))
})

test('general help topics are complete and uniquely identified', () => {
  const ids = generalHelpTopics.map((topic) => topic.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const topic of generalHelpTopics) {
    assert.ok(topic.title.trim().length > 0, `${topic.id} needs a title`)
    assert.ok(topic.summary.trim().length > 0, `${topic.id} needs a summary`)
    assert.ok(topic.points.length > 0, `${topic.id} needs at least one point`)
    if (topic.href) assert.ok(topic.href.startsWith('/'), `${topic.id} href must be internal`)
  }
})
