import { Activity, Application } from '../types'

const base = '2026-10-18'

export const seedApplications: Application[] = [
  {
    id: 'app-figma', company: 'Figma', role: 'Senior Product Designer', stage: 'interview',
    location: 'New York, NY', workType: 'Hybrid', salary: '$170k – $205k', appliedDate: '2026-10-02',
    nextAction: 'Onsite interview', nextActionDate: '2026-10-21', url: 'https://figma.com/careers',
    contact: 'Maya Chen · Talent Partner', notes: 'Strong product craft culture. Prepare the collaboration case study.',
    tags: ['Design systems', 'B2B'], lastUpdated: base, logo: 'F', color: '#f24e3f',
  },
  {
    id: 'app-linear', company: 'Linear', role: 'Product Designer', stage: 'screening',
    location: 'Remote · US', workType: 'Remote', salary: '$155k – $185k', appliedDate: '2026-10-09',
    nextAction: 'Send portfolio follow-up', nextActionDate: '2026-10-19', url: 'https://linear.app/careers',
    contact: 'Alex Rivera · Recruiter', notes: 'Mention the workflow redesign project in follow-up.',
    tags: ['SaaS', 'Remote'], lastUpdated: '2026-10-16', logo: 'L', color: '#5e6ad2',
  },
  {
    id: 'app-notion', company: 'Notion', role: 'Product Designer, Growth', stage: 'applied',
    location: 'San Francisco, CA', workType: 'Hybrid', salary: '$150k – $180k', appliedDate: '2026-10-14',
    nextAction: 'Check application status', nextActionDate: '2026-10-24', url: 'https://notion.so/careers',
    contact: '—', notes: '', tags: ['Growth', 'Product-led'], lastUpdated: '2026-10-14', logo: 'N', color: '#222222',
  },
  {
    id: 'app-vercel', company: 'Vercel', role: 'Senior UX Designer', stage: 'offer',
    location: 'Remote · US', workType: 'Remote', salary: '$180k – $220k', appliedDate: '2026-09-12',
    nextAction: 'Review offer package', nextActionDate: '2026-10-22', url: 'https://vercel.com/careers',
    contact: 'Jordan Bell · Hiring Manager', notes: 'Offer received! Compare equity and growth path.',
    tags: ['Developer tools', 'Remote'], lastUpdated: '2026-10-17', logo: '▲', color: '#111111',
  },
  {
    id: 'app-airtable', company: 'Airtable', role: 'Product Designer', stage: 'interview',
    location: 'San Francisco, CA', workType: 'Hybrid', salary: '$160k – $195k', appliedDate: '2026-09-28',
    nextAction: 'Send thank-you note', nextActionDate: '2026-10-20', url: 'https://airtable.com/careers',
    contact: 'Sofia Patel · Recruiter', notes: 'Great conversation about system flexibility.',
    tags: ['Systems', 'Collaboration'], lastUpdated: '2026-10-15', logo: 'A', color: '#18a977',
  },
  {
    id: 'app-arc', company: 'Arc', role: 'Brand Designer', stage: 'applied',
    location: 'Remote · Americas', workType: 'Remote', salary: '$130k – $165k', appliedDate: '2026-10-11',
    nextAction: 'Follow up with recruiter', nextActionDate: '2026-10-25', url: 'https://arc.net/careers',
    contact: '—', notes: '', tags: ['Brand', 'Remote'], lastUpdated: '2026-10-11', logo: 'A', color: '#eb6b4e',
  },
  {
    id: 'app-coinbase', company: 'Coinbase', role: 'Senior Product Designer', stage: 'rejected',
    location: 'Remote · US', workType: 'Remote', salary: '$175k – $215k', appliedDate: '2026-09-05',
    nextAction: 'Archive after review', nextActionDate: '2026-10-28', url: 'https://coinbase.com/careers',
    contact: 'Taylor Smith · Recruiter', notes: 'Keep warm for future platform roles.', tags: ['Fintech'], lastUpdated: '2026-10-10', logo: 'C', color: '#1652f0',
  },
  {
    id: 'app-superhuman', company: 'Superhuman', role: 'Product Designer', stage: 'screening',
    location: 'New York, NY', workType: 'Hybrid', salary: '$145k – $175k', appliedDate: '2026-10-06',
    nextAction: 'Complete design exercise', nextActionDate: '2026-10-23', url: 'https://superhuman.com/careers',
    contact: 'Priya Shah · Recruiter', notes: 'Exercise due Friday. Block two focused hours.', tags: ['Consumer', 'Craft'], lastUpdated: '2026-10-17', logo: 'S', color: '#f04e98',
  },
]

export const seedActivities: Activity[] = [
  { id: 'activity-1', applicationId: 'app-vercel', type: 'move', text: 'Vercel moved to Offer', date: '2026-10-17' },
  { id: 'activity-2', applicationId: 'app-superhuman', type: 'reminder', text: 'Design exercise due Friday', date: '2026-10-17' },
  { id: 'activity-3', applicationId: 'app-airtable', type: 'note', text: 'Added interview notes for Airtable', date: '2026-10-15' },
  { id: 'activity-4', applicationId: 'app-notion', type: 'created', text: 'Added Notion to your pipeline', date: '2026-10-14' },
]
