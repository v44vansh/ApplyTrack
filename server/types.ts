export type ApplicationDTO = {
  id: string
  company: string
  role: string
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'
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
  version: number
}

export type ActivityDTO = {
  id: string
  applicationId: string
  type: 'move' | 'note' | 'created' | 'reminder'
  text: string
  date: string
}

export type WorkspaceSnapshot = {
  applications: ApplicationDTO[]
  activities: ActivityDTO[]
  revision: string
}
