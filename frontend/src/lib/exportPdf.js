import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportCandidateReport(candidate) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(13, 43, 78)
  doc.rect(0, 0, pageWidth, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text('ProctorAI — Integrity Report', 14, 18)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(14)
  doc.text('Candidate Information', 14, 52)
  doc.setFontSize(10)
  doc.text(`Name: ${candidate.name}`, 14, 62)
  doc.text(`ID: ${candidate.id}`, 14, 70)
  doc.text(`Email: ${candidate.email}`, 14, 78)
  doc.text(`Risk Score: ${candidate.riskScore}/100`, 14, 86)
  doc.text(`Severity: ${candidate.severity}`, 14, 94)

  doc.setFontSize(14)
  doc.text('XAI Explanation', 14, 110)
  doc.setFontSize(10)
  const reasonLines = doc.splitTextToSize(candidate.reason, pageWidth - 28)
  doc.text(reasonLines, 14, 120)

  if (candidate.breakdown.length > 0) {
    autoTable(doc, {
      startY: 135,
      head: [['Signal', 'Count', 'Severity', 'Score Contribution']],
      body: candidate.breakdown.map((h) => [
        h.label,
        String(h.count),
        h.severity,
        String(h.score_contribution),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [13, 43, 78] },
    })
  }

  const finalY = doc.lastAutoTable?.finalY ?? 160

  autoTable(doc, {
    startY: finalY + 10,
    head: [['Timestamp', 'Event', 'Severity']],
    body: candidate.flags.slice(0, 20).map((f) => [
      new Date(f.ts).toLocaleTimeString(),
      f.label,
      f.severity,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [196, 30, 58] },
  })

  doc.save(`ProctorAI_${candidate.id}_report.pdf`)
}

export function exportExamSummary(candidates) {
  const doc = new jsPDF()

  doc.setFillColor(13, 43, 78)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text('ProctorAI — Exam Summary', 14, 22)

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10)
  doc.text(`Total Candidates: ${candidates.length}`, 14, 52)
  doc.text(`Flagged (AMBER+): ${candidates.filter((c) => c.riskScore >= 45).length}`, 14, 60)
  doc.text(`High Risk: ${candidates.filter((c) => c.severity === 'HIGH' || c.severity === 'RED').length}`, 14, 68)

  autoTable(doc, {
    startY: 78,
    head: [['ID', 'Name', 'Score', 'Severity', 'Status', 'XAI Reason']],
    body: candidates.map((c) => [
      c.id,
      c.name,
      String(c.riskScore),
      c.severity,
      c.connected ? 'Online' : 'Offline',
      c.reason.slice(0, 50),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [13, 43, 78] },
    styles: { fontSize: 8 },
  })

  doc.save('ProctorAI_Exam_Summary.pdf')
}
