import { countByStage, responseRate, stageChartData } from './analytics'
import { Application } from '../types'

const app = (stage: Application['stage'], id: string): Application => ({
  id, company: 'Test Co', role: 'Designer', stage, location: 'Remote', workType: 'Remote', salary: '$100k',
  appliedDate: '2026-10-01', nextAction: 'Follow up', tags: [], lastUpdated: '2026-10-01', logo: 'T', color: '#111',
})

describe('application analytics', () => {
  it('counts every pipeline stage, including an empty stage', () => {
    expect(countByStage([app('applied', '1'), app('interview', '2'), app('interview', '3')])).toEqual({
      applied: 1, screening: 0, interview: 2, offer: 0, rejected: 0,
    })
  })

  it('calculates response rate from screening, interview, and offer stages', () => {
    expect(responseRate([app('applied', '1'), app('screening', '2'), app('offer', '3'), app('rejected', '4')])).toBe(50)
    expect(responseRate([])).toBe(0)
  })

  it('keeps chart labels aligned with stage order', () => {
    expect(stageChartData([app('offer', '1')]).map((item) => item.name)).toEqual(['Applied', 'Screening', 'Interview', 'Offer', 'Closed'])
  })
})
