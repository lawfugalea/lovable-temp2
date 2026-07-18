import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { billingGraceDays, getStripe, syncSubscriptionToHousehold } from '@/lib/billing/stripe'

// Stripe signatures are computed over the raw request body.
export const config = { api: { bodyParser: false } }

function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription
    ?? invoice.parent?.subscription_details?.subscription
    ?? null
  if (typeof raw === 'string') return raw
  return raw?.id ?? null
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const householdId = session.client_reference_id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      if (householdId && customerId) {
        await prisma.household.updateMany({ where: { id: householdId }, data: { stripeCustomerId: customerId } })
      }
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (subscriptionId) await syncSubscriptionToHousehold(subscriptionId)
      return
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await syncSubscriptionToHousehold(sub.id)
      return
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = subscriptionIdFromInvoice(invoice)
      if (subscriptionId) {
        await syncSubscriptionToHousehold(subscriptionId)
      } else if (typeof invoice.customer === 'string') {
        // Belt and braces: start the grace window even without a resolvable sub.
        const graceUntil = new Date(Date.now() + billingGraceDays() * 24 * 3600 * 1000)
        await prisma.household.updateMany({
          where: { stripeCustomerId: invoice.customer, graceUntil: null, plan: 'FAMILY' },
          data: { graceUntil },
        })
      }
      return
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = subscriptionIdFromInvoice(invoice)
      if (subscriptionId) await syncSubscriptionToHousehold(subscriptionId)
      return
    }
    default:
      return
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) return res.status(503).json({ error: 'Billing is not configured' })

  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') return res.status(400).json({ error: 'Missing signature' })

  let event: Stripe.Event
  try {
    const raw = await readRawBody(req)
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch (error) {
    console.error('[billing] webhook signature verification failed', error instanceof Error ? error.message : error)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // Idempotency ledger: first writer wins, duplicates acknowledge immediately.
  try {
    await prisma.billingEvent.create({ data: { id: event.id, type: event.type } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(200).json({ received: true, duplicate: true })
    }
    throw error
  }

  try {
    await handleEvent(event)
  } catch (error) {
    // Remove the ledger row so Stripe's retry can reprocess the event.
    await prisma.billingEvent.delete({ where: { id: event.id } }).catch(() => undefined)
    console.error('[billing] webhook handler failed', event.type, error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Webhook handling failed' })
  }

  return res.status(200).json({ received: true })
}
