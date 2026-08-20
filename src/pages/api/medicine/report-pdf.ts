import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { requireMembershipIn } from '@/lib/api-guards'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { respondUpgradeRequired } from '@/lib/entitlements-core'
import { parseRequiredDate } from '@/lib/medicine'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { householdId, startDate, endDate } = req.query

    const context = await requireMembershipIn(req, res, householdId as string)
    if (!context) return
    const entitlements = await getHouseholdEntitlements(householdId as string)
    if (!entitlements.canExportMedicinePdf) return respondUpgradeRequired(res, 'medicinePdf')
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }
    const start = parseRequiredDate(startDate)
    const end = parseRequiredDate(endDate)
    if (!start || !end || start > end) return res.status(400).json({ error: 'Invalid date range' })
    const inclusiveEnd = new Date(end)
    inclusiveEnd.setHours(23, 59, 59, 999)

    try {
      // Get comprehensive data for the report
      const [doses, medicines, children, feverReadings] = await Promise.all([
        // Medicine doses
        prisma.medicineDose.findMany({
          where: { 
            child: { householdId: householdId as string },
            takenAt: {
              gte: start,
              lte: inclusiveEnd
            }
          },
          include: { 
            child: true,
            medicine: true,
            episode: true,
          },
          orderBy: { takenAt: 'asc' }
        }),
        
        // Active medicines
        prisma.medicine.findMany({
          where: { 
            householdId: householdId as string,
            isTemplate: false,
            isActive: true
          },
          include: { 
            child: true,
            doses: {
              where: {
                takenAt: {
                  gte: start,
                  lte: inclusiveEnd
                }
              },
              orderBy: { takenAt: 'desc' }
            }
          }
        }),
        
        // Children
        prisma.child.findMany({
          where: { householdId: householdId as string },
          orderBy: { name: 'asc' }
        }),
        
        // Fever readings
        prisma.feverReading.findMany({
          where: { 
            child: { householdId: householdId as string },
            takenAt: {
              gte: start,
              lte: inclusiveEnd
            }
          },
          include: { child: true, episode: true },
          orderBy: { takenAt: 'desc' }
        })
      ])

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Helper function to add new page if needed
      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
          return true
        }
        return false
      }

      // Helper function to add text with word wrap
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
        pdf.setFontSize(fontSize)
        const lines = pdf.splitTextToSize(text, maxWidth)
        pdf.text(lines, x, y)
        return y + (lines.length * fontSize * 0.4)
      }

      // Helper function to draw a line
      const drawLine = (y: number) => {
        pdf.setDrawColor(200, 200, 200)
        pdf.line(20, y, pageWidth - 20, y)
      }

      // Header with app branding
      pdf.setFillColor(139, 69, 19) // Cozy brown
      pdf.rect(0, 0, pageWidth, 35, 'F')
      
      // App logo/icon (using text for now)
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Clankeep', 20, 22)
      
      // Subtitle
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Medicine & Health Management', 20, 28)
      
      // Report title
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('Medicine & Health Report', 20, 50, pageWidth - 40, 18)
      
      // Report period
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      yPosition = addText(
        `Period: ${format(new Date(startDate as string), 'MMMM dd, yyyy')} - ${format(new Date(endDate as string), 'MMMM dd, yyyy')}`,
        20, yPosition + 5, pageWidth - 40, 12
      )
      
      // Generated date
      yPosition = addText(
        `Generated: ${format(new Date(), 'MMMM dd, yyyy at HH:mm')}`,
        20, yPosition + 3, pageWidth - 40, 10
      )
      
      yPosition += 10
      drawLine(yPosition)
      yPosition += 10

      // Summary section
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(139, 69, 19) // Cozy brown
      yPosition = addText('Summary', 20, yPosition, pageWidth - 40, 14)
      yPosition += 5
      
      // Add a subtle background for summary
      pdf.setFillColor(250, 250, 250)
      pdf.rect(15, yPosition - 2, pageWidth - 30, 25, 'F')
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(0, 0, 0)
      yPosition = addText(`• Total doses administered: ${doses.length}`, 25, yPosition, pageWidth - 45, 10)
      yPosition = addText(`• Fever readings recorded: ${feverReadings.length}`, 25, yPosition, pageWidth - 45, 10)
      yPosition = addText(`• Active medicine templates: ${medicines.length}`, 25, yPosition, pageWidth - 45, 10)
      yPosition = addText(`• Children in household: ${children.length}`, 25, yPosition, pageWidth - 45, 10)
      
      yPosition += 10
      drawLine(yPosition)
      yPosition += 10

      // Medicine doses section
      checkNewPage(50)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(139, 69, 19) // Cozy brown
      yPosition = addText('Medicine Doses Administered', 20, yPosition, pageWidth - 40, 14)
      yPosition += 5
      
      if (doses.length > 0) {

        // Group doses by child
        const groupedByChild = doses.reduce((acc, dose) => {
          if (!acc[dose.child.name]) {
            acc[dose.child.name] = []
          }
          acc[dose.child.name].push(dose)
          return acc
        }, {} as Record<string, typeof doses>)

        Object.entries(groupedByChild).forEach(([childName, childDoses]) => {
          checkNewPage(30)
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(139, 69, 19) // Cozy brown
          yPosition = addText(`${childName}`, 25, yPosition, pageWidth - 45, 12)
          yPosition += 3
          
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(0, 0, 0)
          
          childDoses.forEach(dose => {
            checkNewPage(15)
            const doseText = `• ${dose.medicine.name} (${dose.dosage}) - ${format(new Date(dose.takenAt), 'MMM dd, HH:mm')} · ${dose.episode.title || 'Illness episode'}`
            yPosition = addText(doseText, 30, yPosition, pageWidth - 50, 9)
            
            if (dose.notes) {
              yPosition = addText(`  Notes: ${dose.notes}`, 35, yPosition, pageWidth - 55, 8)
            }
            yPosition += 2
          })
          yPosition += 5
        })
        
        yPosition += 5
      } else {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(128, 128, 128)
        yPosition = addText('No medicine doses were administered during this period.', 25, yPosition, pageWidth - 45, 10)
        yPosition += 5
      }
      
      drawLine(yPosition)
      yPosition += 10

      // Active medicines section
      if (medicines.length > 0) {
        checkNewPage(50)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(139, 69, 19) // Cozy brown
        yPosition = addText('Active Medicine Templates', 20, yPosition, pageWidth - 40, 14)
        yPosition += 5

        medicines.forEach(medicine => {
          checkNewPage(25)
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(139, 69, 19) // Cozy brown
          yPosition = addText(`• ${medicine.name}`, 25, yPosition, pageWidth - 45, 11)
          yPosition += 2
          
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(0, 0, 0)
          yPosition = addText(`  Child: ${medicine.child?.name || 'Template'}`, 30, yPosition, pageWidth - 50, 9)
          yPosition = addText(`  Dosage: ${medicine.dosage}`, 30, yPosition, pageWidth - 50, 9)
          yPosition = addText(`  Frequency: ${medicine.frequency}`, 30, yPosition, pageWidth - 50, 9)
          
          if (medicine.nextDoseOverride) {
            pdf.setTextColor(128, 0, 128) // Purple for override
            yPosition = addText(`  Next dose override: ${format(new Date(medicine.nextDoseOverride), 'MMM dd, HH:mm')}`, 30, yPosition, pageWidth - 50, 9)
            if (medicine.overrideReason) {
              yPosition = addText(`  Override reason: ${medicine.overrideReason}`, 30, yPosition, pageWidth - 50, 9)
            }
            pdf.setTextColor(0, 0, 0)
          }
          
          if (medicine.notes) {
            yPosition = addText(`  Notes: ${medicine.notes}`, 30, yPosition, pageWidth - 50, 9)
          }
          yPosition += 5
        })
        
        yPosition += 5
        drawLine(yPosition)
        yPosition += 10
      }

      // Fever readings section
      checkNewPage(50)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(139, 69, 19) // Cozy brown
      yPosition = addText('Fever Journal', 20, yPosition, pageWidth - 40, 14)
      yPosition += 5
      
      if (feverReadings.length > 0) {

        // Group fever readings by child
        const groupedFeverByChild = feverReadings.reduce((acc, reading) => {
          if (!acc[reading.child.name]) {
            acc[reading.child.name] = []
          }
          acc[reading.child.name].push(reading)
          return acc
        }, {} as Record<string, typeof feverReadings>)

        Object.entries(groupedFeverByChild).forEach(([childName, childReadings]) => {
          checkNewPage(30)
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(220, 38, 38) // Red for fever
          yPosition = addText(`${childName}`, 25, yPosition, pageWidth - 45, 12)
          yPosition += 3
          
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(0, 0, 0)
          
          childReadings.forEach(reading => {
            checkNewPage(15)
            const tempColor = reading.temperature >= 38 ? '220, 38, 38' : '34, 197, 94' // Red if fever, green if normal
            pdf.setTextColor(parseInt(tempColor.split(',')[0]), parseInt(tempColor.split(',')[1]), parseInt(tempColor.split(',')[2]))
            
            const readingText = `• ${reading.temperature}°${reading.unit} (${reading.method}) - ${format(new Date(reading.takenAt), 'MMM dd, HH:mm')} · ${reading.episode.title || 'Illness episode'}`
            yPosition = addText(readingText, 30, yPosition, pageWidth - 50, 9)
            
            if (reading.notes) {
              pdf.setTextColor(0, 0, 0)
              yPosition = addText(`  Notes: ${reading.notes}`, 35, yPosition, pageWidth - 55, 8)
            }
            yPosition += 2
          })
          yPosition += 5
        })
      } else {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(128, 128, 128)
        yPosition = addText('No fever readings were recorded during this period.', 25, yPosition, pageWidth - 45, 10)
        yPosition += 5
      }

      // Footer
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10)
        pdf.text('Generated by Clankeep', 20, pageHeight - 10)
      }

      // Generate PDF buffer
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="clankeep-medicine-report-${startDate}-to-${endDate}.pdf"`)
      res.setHeader('Content-Length', pdfBuffer.length)

      return res.send(pdfBuffer)
    } catch (error) {
      console.error('Failed to generate PDF report:', error)
      return res.status(500).json({ error: 'Failed to generate PDF report' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
