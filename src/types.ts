export type Stage = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'

export type Application = {
  id: string
  company: string
  role: string
  stage: Stage
  location: string
  workType: 'Remote' | 'Hybrid' | 'On-site'
  salary: string
  appliedDate: string
  nextAction: string
  nextActionDate?: string
  url?: string
  contact?: string
  notes?: string
  tags: string[]
  lastUpdated: string
  logo: string
  color: string
}

export type Activity = {
  id: string
  applicationId: string
  type: 'move' | 'note' | 'created' | 'reminder'
  text: string
  date: string
}

export const STAGES: Array<{ id: Stage; label: string; short: string; color: string; soft: string }> = [
  { id: 'applied', label: 'Applied', short: 'Applied', color: '#6d7f92', soft: '#eef2f6' },
  { id: 'screening', label: 'Screening', short: 'Screening', color: '#d18b3d', soft: '#fff6e8' },
  { id: 'interview', label: 'Interview', short: 'Interview', color: '#4b77c5', soft: '#edf3ff' },
  { id: 'offer', label: 'Offer', short: 'Offer', color: '#3d9b80', soft: '#eaf8f3' },
  { id: 'rejected', label: 'Closed', short: 'Closed', color: '#c26b6b', soft: '#fff0f0' },
]

export const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Closed',
}
