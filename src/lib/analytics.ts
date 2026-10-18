import { Application, Stage, STAGE_LABELS } from '../types'

export function countByStage(applications: Application[]) {
  const counts: Record<Stage, number> = { applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0 }
  applications.forEach((app) => { counts[app.stage] += 1 })
  return counts
}

export function stageChartData(applications: Application[]) {
  const counts = countByStage(applications)
  return (Object.keys(counts) as Stage[]).map((stage) => ({ name: STAGE_LABELS[stage], value: counts[stage], stage }))
}

export function responseRate(applications: Application[]) {
  if (!applications.length) return 0
  const responded = applications.filter((app) => ['screening', 'interview', 'offer'].includes(app.stage)).length
  return Math.round((responded / applications.length) * 100)
}

export function weeklyActivityData(applications: Application[]) {
  const reference = applications.reduce((latest, application) => application.appliedDate > latest ? application.appliedDate : latest, '2026-10-18')
  const referenceDate = new Date(`${reference}T12:00:00`)
  const start = new Date(referenceDate)
  start.setDate(start.getDate() - (4 * 7) - start.getDay())
  const weeks = Array.from({ length: 5 }, (_, index) => {
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + (index * 7))
    return { name: new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(weekStart), applied: 0, interviews: 0 }
  })
  applications.forEach((application) => {
    const appliedDate = new Date(`${application.appliedDate}T12:00:00`)
    const index = Math.floor((appliedDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (index >= 0 && index < weeks.length) {
      weeks[index].applied += 1
      if (application.stage === 'interview' || application.stage === 'offer') weeks[index].interviews += 1
    }
  })
  return weeks
}
