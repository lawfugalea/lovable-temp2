import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { getMedicineSchedule } from '@/lib/medicine'
import { withBasePath } from '@/lib/base-path'

const MAX_ATTEMPTS = 3

export function isMedicinePushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim()
    && process.env.VAPID_PRIVATE_KEY?.trim()
    && process.env.VAPID_SUBJECT?.trim()
  )
}

export function medicinePushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null
}

function configureWebPush() {
  const publicKey = medicinePushPublicKey()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()
  if (!publicKey || !privateKey || !subject) throw new Error('Medicine Web Push is not configured')
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function queueDueMedicineDeliveries(now = new Date()): Promise<number> {
  if (!isMedicinePushConfigured()) return 0
  const medicines = await prisma.medicine.findMany({
    where: {
      isTemplate: false,
      isActive: true,
      isPrn: false,
      scheduleVerifiedAt: { not: null },
      childId: { not: null },
    },
    include: {
      doses: { orderBy: { takenAt: 'desc' }, take: 1 },
    },
  })

  let queued = 0
  for (const medicine of medicines) {
    const schedule = getMedicineSchedule(medicine, medicine.doses, now)
    if (!schedule.isDue || !schedule.nextDoseTime || !medicine.childId) continue
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        householdId: medicine.householdId,
        enabled: true,
        user: { memberships: { some: { householdId: medicine.householdId } } },
      },
      select: { id: true },
    })
    if (!subscriptions.length) continue
    const result = await prisma.pushDelivery.createMany({
      data: subscriptions.map((subscription) => ({
        subscriptionId: subscription.id,
        medicineId: medicine.id,
        scheduledAt: schedule.nextDoseTime!,
      })),
      skipDuplicates: true,
    })
    queued += result.count
  }
  return queued
}

export async function dispatchMedicinePush(now = new Date()): Promise<{ queued: number; sent: number; failed: number }> {
  if (!isMedicinePushConfigured()) return { queued: 0, sent: 0, failed: 0 }
  configureWebPush()
  await prisma.pushDelivery.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
    data: { status: 'FAILED', lastError: 'Delivery claim expired before completion' },
  })
  const queued = await queueDueMedicineDeliveries(now)
  const candidates = await prisma.pushDelivery.findMany({
    where: {
      scheduledAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
      status: { in: ['PENDING', 'FAILED'] },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
    select: { id: true },
  })

  let sent = 0
  let failed = 0
  for (const candidate of candidates) {
    const claimed = await prisma.pushDelivery.updateMany({
      where: { id: candidate.id, status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: MAX_ATTEMPTS } },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
    })
    if (!claimed.count) continue
    const delivery = await prisma.pushDelivery.findUnique({
      where: { id: candidate.id },
      include: { subscription: true, medicine: { include: { doses: { orderBy: { takenAt: 'desc' }, take: 1 } } } },
    })
    if (!delivery) continue
    const currentSchedule = getMedicineSchedule(delivery.medicine, delivery.medicine.doses, now)
    if (!currentSchedule.isDue || !currentSchedule.nextDoseTime || currentSchedule.nextDoseTime.getTime() !== delivery.scheduledAt.getTime()) {
      await prisma.pushDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELLED', lastError: 'Regimen changed before delivery' },
      })
      continue
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: delivery.subscription.endpoint,
          keys: { p256dh: delivery.subscription.p256dh, auth: delivery.subscription.auth },
        },
        JSON.stringify({
          title: 'Clankeep',
          body: 'Medicine reminder due',
          tag: `medicine-${delivery.medicineId}-${delivery.scheduledAt.toISOString()}`,
          url: withBasePath('/medicine'),
        })
      )
      await prisma.pushDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), lastError: null } })
      sent += 1
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Push delivery failed'
      await prisma.$transaction([
        prisma.pushDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', lastError: message } }),
        ...(statusCode === 404 || statusCode === 410
          ? [prisma.pushSubscription.update({ where: { id: delivery.subscriptionId }, data: { enabled: false } })]
          : []),
      ])
      failed += 1
    }
  }
  return { queued, sent, failed }
}
