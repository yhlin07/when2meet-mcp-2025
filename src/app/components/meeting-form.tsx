'use client'

import { useRef, useEffect } from 'react'
import ReportView from '@/app/components/report-view'
import { useReportGeneration } from '@/app/hooks/use-report-generation'

export default function MeetingForm() {
  const { formData, report, loading, loadingText, error, handleInputChange, generateReport } =
    useReportGeneration()
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (report && reportRef.current) {
      // Small delay to ensure DOM is fully updated
      setTimeout(() => {
        if (reportRef.current) {
          const rect = reportRef.current.getBoundingClientRect()
          const viewportHeight = window.innerHeight

          // If report is taller than viewport, scroll to the bottom
          // Otherwise, scroll the report into view at the top
          if (rect.height > viewportHeight) {
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: 'smooth',
            })
          } else {
            reportRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }
        }
      }, 100)
    }
  }, [report])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-coral scribble-border p-10">
        <h1 className="text-4xl font-heading font-bold text-center mb-8 transform rotate-1">
          Meeting prep!
        </h1>

        <div className="max-w-2xl mx-auto space-y-5">
          <input
            className="w-full p-4 text-lg bg-mint sketch-input font-heading placeholder:text-gray-500"
            type="text"
            name="linkedinUrl"
            placeholder="LinkedIn profile URL (we'll search public info)"
            value={formData.linkedinUrl}
            onChange={handleInputChange}
          />
          <textarea
            rows={4}
            className="w-full p-4 text-lg bg-mint sketch-input font-heading placeholder:text-gray-500 resize-y"
            name="additionalNotes"
            placeholder="Additional notes about the person/meeting (optional)"
            value={formData.additionalNotes}
            onChange={handleInputChange}
          />
          <button
            className="w-full p-4 text-xl bg-sky sketch-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
            onClick={generateReport}
          >
            {loading ? '✨ Generating…' : "🚀 Let's go!"}
          </button>

          {error && <p className="mt-4 text-red-600 text-center font-heading">{error}</p>}

          {loading && (
            <div className="mt-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-lg font-heading">{loadingText}</p>
            </div>
          )}

          {report && <ReportView ref={reportRef} report={report} />}
        </div>
      </div>
    </div>
  )
}
