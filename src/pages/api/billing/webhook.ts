import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import type Stripe from 'stripe'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { billingGraceDays, getStripe, syncSubscriptionToHousehold } from '@/lib/billing/stripe'
import { appUrl } from '@/lib/links'
import { readCheckoutMeasurement } from '@/lib/meta/checkout'
import { sendMetaEvents } from '@/lib/meta/conversions'

// Stripe signatures are computed over the raw request body.
export const config = { api: { bodyParser: false } }

/**
 * Turning off the body parser also turns off Next's built-in size limit, so the
 * cap has to be reimposed here. Without it this route — which is unauthenticated
 * by necessity, since the signature can only be checked after the body is read —
 * buffers whatever an anonymous caller sends straight into process memory.
 *
 * Stripe event payloads are a few kilobytes; 1 MiB is far above anything real
 * and far below anything that threatens the container.
 */
const MAX_WEBHOOK_BYTES = 1024 * 1024

function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let chunks: Buffer[] = []
    let total = 0
    let aborted = false

    const onData = (chunk: Buffer) => {
      total += chunk.length
      if (total > MAX_WEBHOOK_BYTES) {
        aborted = true
        // Drop what was buffered and stop reading — that is what bounds memory.
        // Pause rather than destroy: destroying here kills the socket before the
        // 413 can be flushed, so the sender sees a connection reset and cannot
        // tell a size rejection from a network fault. Once nothing is draining
        // the stream, TCP backpressure keeps the unread remainder off the heap.
        chunks = []
        req.off('data', onData)
        req.pause()
        reject(Object.assign(new Error('Webhook payload too large'), { tooLarge: true }))
        return
      }
      chunks.push(Buffer.from(chunk))
    }

    req.on('data', onData)
    req.on('end', () => {
      if (!aborted) resolve(Buffer.concat(chunks, total))
    })
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

      // The conversion an ad campaign is actually buying. Reported from here
      // rather than from the browser because this is the point at which Stripe
      // confirms the money, and reported at most once because the idempotency
      // ledger above rejects a repeated delivery of this event.
      const measurement = readCheckoutMeasurement(session.metadata)
      if (measurement.consented) {
        const amountTotal = session.amount_total
        void sendMetaEvents([{
          eventName: 'Purchase',
          eventId: measurement.eventId,
          eventSourceUrl: appUrl('/settings?tab=billing'),
          userData: {
            email: session.customer_details?.email ?? null,
            fbp: measurement.fbp,
            fbc: measurement.fbc,
          },
          ...(amountTotal !== null && session.currency
            ? { value: amountTotal / 100, currency: session.currency }
            : {}),
        }]).catch(error => console.warn('[meta] purchase conversion not reported', error))
      }
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) return res.status(503).json({ error: 'Billing is not configured' })

  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') return res.status(400).json({ error: 'Missing signature' })

  let raw: Buffer
  try {
    raw = await readRawBody(req)
  } catch (error) {
    if ((error as { tooLarge?: boolean })?.tooLarge) {
      // The rest of the body is still in flight and will never be read, so this
      // connection cannot be reused — keep-alive would parse the remainder as
      // the start of the next request.
      res.setHeader('Connection', 'close')
      return res.status(413).json({ error: 'Payload too large' })
    }
    throw error
  }

  let event: Stripe.Event
  try {
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

export default withApiHandler(handler)
