import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { requireMembershipIn } from '@/lib/api-guards'
import { parseRequiredDate } from '@/lib/medicine'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { householdId, startDate, endDate } = req.query

    const context = await requireMembershipIn(req, res, householdId as string)
    if (!context) return
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }
    const start = parseRequiredDate(startDate)
    const end = parseRequiredDate(endDate)
    if (!start || !end || start > end) return res.status(400).json({ error: 'Invalid date range' })

    try {
      const [doses, temperatures] = await Promise.all([prisma.medicineDose.findMany({
        where: { 
          child: { householdId: householdId as string },
          takenAt: {
            gte: start,
            lte: end
          }
        },
        include: { 
          child: true,
          medicine: true,
          episode: true,
        },
        orderBy: { takenAt: 'asc' }
      }), prisma.feverReading.findMany({
        where: {
          child: { householdId: householdId as string },
          takenAt: { gte: start, lte: end },
        },
        include: { child: true, episode: true },
        orderBy: { takenAt: 'asc' },
      })])

      // Generate simple text report
      let report = `Medicine Report\n`
      report += `Period: ${format(new Date(startDate as string), 'MMM dd, yyyy')} - ${format(new Date(endDate as string), 'MMM dd, yyyy')}\n\n`
      
      const groupedByChild = doses.reduce((acc, dose) => {
        if (!acc[dose.child.name]) {
          acc[dose.child.name] = []
        }
        acc[dose.child.name].push(dose)
        return acc
      }, {} as Record<string, typeof doses>)

      Object.entries(groupedByChild).forEach(([childName, childDoses]) => {
        report += `${childName}:\n`
        childDoses.forEach(dose => {
          report += `  - ${dose.medicine.name}: ${dose.dosage} at ${format(new Date(dose.takenAt), 'MMM dd, yyyy HH:mm')} [${dose.episode.title || 'Illness episode'}]\n`
          if (dose.notes) {
            report += `    Notes: ${dose.notes}\n`
          }
        })
        report += `\n`
      })

      report += `Temperature readings:\n`
      temperatures.forEach(reading => {
        report += `  - ${reading.child.name}: ${reading.temperature}°${reading.unit} at ${format(new Date(reading.takenAt), 'MMM dd, yyyy HH:mm')} [${reading.episode.title || 'Illness episode'}]\n`
        if (reading.notes) report += `    Notes: ${reading.notes}\n`
      })

      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Content-Disposition', `attachment; filename="medicine-report-${startDate}-to-${endDate}.txt"`)
      return res.send(report)
    } catch (error) {
      console.error('Failed to generate report:', error)
      return res.status(500).json({ error: 'Failed to generate report' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
