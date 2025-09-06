import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const { householdId, startDate, endDate } = req.query
    
    if (!householdId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    try {
      const doses = await prisma.medicineDose.findMany({
        where: { 
          child: { householdId: householdId as string },
          takenAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        include: { 
          child: true,
          medicine: true 
        },
        orderBy: { takenAt: 'asc' }
      })

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
          report += `  - ${dose.medicine.name}: ${dose.dosage} at ${format(new Date(dose.takenAt), 'MMM dd, yyyy HH:mm')}\n`
          if (dose.notes) {
            report += `    Notes: ${dose.notes}\n`
          }
        })
        report += `\n`
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
