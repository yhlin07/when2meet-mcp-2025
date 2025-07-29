'use client'

import { useState } from 'react'

export type Question = { q: string; why: string }
export interface Report {
  opener: string
  questions: Question[]
}

export interface FormData {
  linkedinUrl: string
  additionalNotes: string
}

export function useReportGeneration() {
  const [formData, setFormData] = useState<FormData>({
    linkedinUrl: '',
    additionalNotes: '',
  })
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const generateReport = async () => {
    if (loading) return

    if (!formData.linkedinUrl.trim()) {
      setError('Please enter a LinkedIn profile URL.')
      return
    }

    setLoading(true)
    setError('')
    setReport(null)
    setLoadingText('✨ Preparing your meeting dossier...')

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkedinUrl: formData.linkedinUrl,
          additionalNotes: formData.additionalNotes,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.text) {
                setLoadingText(data.text)
              }
              if (data.done) {
                setReport(data.report)
                setLoading(false)
                setLoadingText('')
                return
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
          if (line.startsWith('event: error')) {
            const nextLine = lines[lines.indexOf(line) + 1]
            if (nextLine?.startsWith('data: ')) {
              try {
                const errorData = JSON.parse(nextLine.slice(6))
                setError(errorData.error || 'Stream error')
              } catch (parseError) {
                console.error('Error parsing error data:', parseError)
                setError('Stream error')
              }
            }
            setLoading(false)
            return
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return {
    formData,
    report,
    loading,
    loadingText,
    error,
    handleInputChange,
    generateReport,
  }
}
