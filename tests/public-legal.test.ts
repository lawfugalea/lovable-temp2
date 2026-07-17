import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicLegalConfig } from '../src/lib/public-legal'

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

test('public legal details use the dedicated contact when configured', () => {
  const previousName = process.env.PRIVACY_CONTROLLER_NAME
  const previousContact = process.env.DATA_PROTECTION_EMAIL
  const previousOwner = process.env.FINANCE_OWNER_EMAIL
  process.env.PRIVACY_CONTROLLER_NAME = 'Personal Operator '
  process.env.DATA_PROTECTION_EMAIL = ' privacy@example.com '
  process.env.FINANCE_OWNER_EMAIL = 'owner@example.com'

  try {
    assert.deepEqual(getPublicLegalConfig(), {
      controllerName: 'Personal Operator',
      contactEmail: 'privacy@example.com',
      contactConfigured: true,
      lastUpdated: '16 July 2026',
    })
  } finally {
    restore('PRIVACY_CONTROLLER_NAME', previousName)
    restore('DATA_PROTECTION_EMAIL', previousContact)
    restore('FINANCE_OWNER_EMAIL', previousOwner)
  }
})

test('a personal deployment can reuse its finance-owner email as the public privacy contact', () => {
  const previousContact = process.env.DATA_PROTECTION_EMAIL
  const previousOwner = process.env.FINANCE_OWNER_EMAIL
  delete process.env.DATA_PROTECTION_EMAIL
  process.env.FINANCE_OWNER_EMAIL = 'owner@example.com '

  try {
    const config = getPublicLegalConfig()
    assert.equal(config.contactEmail, 'owner@example.com')
    assert.equal(config.contactConfigured, true)
  } finally {
    restore('DATA_PROTECTION_EMAIL', previousContact)
    restore('FINANCE_OWNER_EMAIL', previousOwner)
  }
})
