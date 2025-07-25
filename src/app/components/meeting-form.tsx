'use client'

import ReportView from '@/app/components/report-view'
import { useReportGeneration } from '@/app/hooks/use-report-generation'

export default function MeetingForm() {
  const {
    formData,
    report,
    loading,
    streamText,
    error,
    partialOpener,
    partialQuestions,
    handleInputChange,
    generateReport,
  } = useReportGeneration()

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
            placeholder="LinkedIn URL"
            value={formData.linkedinUrl}
            onChange={handleInputChange}
          />
          <textarea
            rows={4}
            className="w-full p-4 text-lg bg-mint sketch-input font-heading placeholder:text-gray-500 resize-y"
            name="websiteContent"
            placeholder="Extra website notes (optional)"
            value={formData.websiteContent}
            onChange={handleInputChange}
          />
          <button
            className="w-full p-4 text-xl bg-sky sketch-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
            onClick={generateReport}
          >
            {loading ? '✨ Generating…' : "🚀 Let's go!"}
          </button>

          {error && (
            <p className="mt-4 text-red-600 text-center font-heading">
              {error}
            </p>
          )}

          {streamText && (
            <pre className="mt-4 font-heading text-sm bg-white sketch-card overflow-auto max-h-96">
              {streamText}
            </pre>
          )}

          {/* Partial Results - Show as they stream in */}
          {(partialOpener || partialQuestions.length > 0) && (
            <div className="mt-8 font-heading">
              {partialOpener && (
                <div className="mb-6">
                  <h2 className="text-2xl font-heading mb-4 transform -rotate-1">
                    🧊 Ice-breaker
                  </h2>
                  <p className="text-lg leading-relaxed bg-mint/50 sketch-card">
                    {partialOpener}
                  </p>
                </div>
              )}

              {partialQuestions.length > 0 && (
                <div>
                  <h2 className="text-2xl font-heading mb-4 transform rotate-1">
                    ❓ Questions
                  </h2>
                  <ul className="space-y-4">
                    {partialQuestions.map((question, idx) => (
                      <li
                        key={idx}
                        className="bg-sky/50 sketch-card animate-in slide-in-from-bottom duration-500"
                      >
                        <strong className="text-lg font-heading block mb-2">
                          {question.q}
                        </strong>
                        <small className="text-gray-600">
                          Why: {question.why}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Final complete report (hidden when partial results are shown) */}
          {report && !partialOpener && <ReportView report={report} />}
        </div>
      </div>
    </div>
  )
}
