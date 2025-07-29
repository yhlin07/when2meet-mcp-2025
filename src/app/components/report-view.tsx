import { forwardRef } from 'react'
import { Report } from '@/app/hooks/use-report-generation'

interface ReportViewProps {
  report: Report
}

const ReportView = forwardRef<HTMLDivElement, ReportViewProps>(({ report }, ref) => {
  return (
    <div ref={ref} className="mt-8 font-heading">
      <h2 className="text-2xl font-heading mb-4 transform -rotate-1">💬 Conversation starter</h2>
      <p className="mb-6 text-lg leading-relaxed bg-mint/50 sketch-card">{report.opener}</p>

      <h2 className="text-2xl font-heading mb-4 transform rotate-1">🎤 Smart questions</h2>
      <ul className="space-y-4">
        {report.questions.map((q, idx) => (
          <li key={idx} className="bg-sky/50 sketch-card">
            <strong className="text-lg font-heading block mb-2">{q.q}</strong>
            <small className="text-gray-600">Why: {q.why}</small>
          </li>
        ))}
      </ul>
    </div>
  )
})

ReportView.displayName = 'ReportView'

export default ReportView
