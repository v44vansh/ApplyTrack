import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, Check,
  CheckCircle2, ChevronDown, CircleAlert, Clock3, Command, ExternalLink, Filter, GripVertical,
  Kanban, LayoutDashboard, List, LogOut, Mail, MapPin, Menu, Moon, MoreHorizontal, Pencil,
  Plus, RefreshCw, RotateCcw, Search, Settings2, SlidersHorizontal, Sparkles, Sun, Target,
  Trash2, UserRound, WifiOff, X, Zap,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { seedActivities } from './data/seed'
import { countByStage, responseRate, stageChartData, weeklyActivityData } from './lib/analytics'
import { useAppStore } from './store/useAppStore'
import { Application, STAGES, STAGE_LABELS, Stage } from './types'

type View = 'dashboard' | 'applications' | 'insights' | 'settings'
type Modal = 'create' | 'edit' | null

const applicationSchema = z.object({
  company: z.string().trim().min(1, 'Company is required'),
  role: z.string().trim().min(1, 'Role is required'),
  stage: z.enum(['applied', 'screening', 'interview', 'offer', 'rejected']),
  location: z.string().trim().min(1, 'Location is required'),
  workType: z.enum(['Remote', 'Hybrid', 'On-site']),
  salary: z.string().trim().min(1, 'Add a salary range or “Undisclosed”'),
  appliedDate: z.string().min(1, 'Date is required'),
  nextAction: z.string().trim().min(1, 'Add the next action'),
  nextActionDate: z.string().optional(),
  url: z.string().optional(),
})

type FormValues = z.infer<typeof applicationSchema>

const uid = () => `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const today = new Date().toISOString().slice(0, 10)

function formatDate(value?: string) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function stageColor(stage: Stage) {
  return STAGES.find((item) => item.id === stage)?.color ?? '#6d7f92'
}

function App() {
  const { applications, hydrated, initialize, theme, setTheme, addApplication, updateApplication, moveApplication, deleteApplication, resetDemo, replaceApplications } = useAppStore()
  const [view, setView] = useState<View>('dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [layout, setLayout] = useState<'board' | 'list'>('board')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  useEffect(() => { void initialize() }, [initialize])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    const channel = (() => { try { return new BroadcastChannel('applytrack-sync') } catch { return null } })()
    if (channel) channel.onmessage = (event) => { if (Array.isArray(event.data)) replaceApplications(event.data as Application[]) }
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'applytrack-applications' && event.newValue) {
        try { replaceApplications(JSON.parse(event.newValue) as Application[]) } catch { /* ignore malformed local data */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => { channel?.close(); window.removeEventListener('storage', onStorage) }
  }, [replaceApplications])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!modal && !selectedId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModal(null)
        setSelectedId(null)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [modal, selectedId])

  const selected = applications.find((application) => application.id === selectedId) ?? null
  const counts = useMemo(() => countByStage(applications), [applications])
  const activeApplications = applications.filter((application) => application.stage !== 'rejected')
  const filteredApplications = useMemo(() => applications.filter((application) => {
    const query = search.toLowerCase()
    const matchesSearch = !query || [application.company, application.role, application.location, ...application.tags].join(' ').toLowerCase().includes(query)
    return matchesSearch && (stageFilter === 'all' || application.stage === stageFilter)
  }), [applications, search, stageFilter])

  const notify = (message: string) => setToast(message)
  const openCreate = () => { setModal('create'); setSidebarOpen(false) }
  const openApplication = (application: Application) => setSelectedId(application.id)
  const handleMove = (id: string, stage: Stage) => {
    moveApplication(id, stage)
    notify(`Moved to ${STAGE_LABELS[stage]}`)
  }
  const handleDelete = (id: string) => {
    const application = applications.find((item) => item.id === id)
    if (!application || !window.confirm(`Remove ${application.company} from your pipeline?`)) return
    deleteApplication(id)
    setSelectedId(null)
    notify('Application removed')
  }

  if (!hydrated) return <LoadingScreen />

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} openCreate={openCreate} applicationCount={applications.length} open={sidebarOpen} close={() => setSidebarOpen(false)} />
      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><ArrowRight size={14} /><strong>{view === 'dashboard' ? 'Overview' : view[0].toUpperCase() + view.slice(1)}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={16} /><input aria-label="Search applications" placeholder="Search applications" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd><Command size={11} /> K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
            <button className="avatar-button" aria-label="Open profile menu">JD</button>
          </div>
        </header>

        <div className="page-content">
          {view === 'dashboard' && <Dashboard applications={filteredApplications} counts={counts} activeApplications={activeApplications} onCreate={openCreate} onSelect={openApplication} onMove={handleMove} onViewAll={() => setView('applications')} draggedId={draggedId} setDraggedId={setDraggedId} />}
          {view === 'applications' && <ApplicationsView applications={filteredApplications} allApplications={applications} search={search} setSearch={setSearch} stageFilter={stageFilter} setStageFilter={setStageFilter} layout={layout} setLayout={setLayout} onCreate={openCreate} onSelect={openApplication} onMove={handleMove} onDelete={handleDelete} draggedId={draggedId} setDraggedId={setDraggedId} />}
          {view === 'insights' && <Insights applications={applications} counts={counts} />}
          {view === 'settings' && <Settings theme={theme} setTheme={setTheme} onReset={async () => { await resetDemo(); notify('Demo data restored') }} />}
        </div>
      </main>

      {selected && <ApplicationDrawer application={selected} onClose={() => setSelectedId(null)} onEdit={() => setModal('edit')} onMove={handleMove} onDelete={() => handleDelete(selected.id)} onSaveNote={(notes) => { updateApplication(selected.id, { notes }); notify('Notes saved') }} />}
      {modal && <ApplicationModal mode={modal} application={modal === 'edit' ? selected : null} onClose={() => setModal(null)} onSave={(application, editing) => { editing ? updateApplication(application.id, application) : addApplication(application); setModal(null); notify(editing ? 'Application updated' : 'Application added to your pipeline') }} />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  )
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark">✓</div><span>Loading your workspace…</span></div>
}

type SidebarProps = { view: View; setView: (view: View) => void; openCreate: () => void; applicationCount: number; open: boolean; close: () => void }

function Sidebar({ view, setView, openCreate, applicationCount, open, close }: SidebarProps) {
  const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard; badge?: string }> = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: BriefcaseBusiness, badge: String(applicationCount) },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
  ]
  return <>
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={close} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">✓</div><div><strong>apply<span>track</span></strong><small>job search, in focus</small></div><button className="mobile-close icon-button" aria-label="Close navigation" onClick={close}><X size={18} /></button></div>
      <button className="add-button" onClick={openCreate}><Plus size={17} strokeWidth={2.5} /><span>Add application</span><kbd>⌘ N</kbd></button>
      <nav className="nav-list" aria-label="Main navigation">
        <span className="nav-label">Workspace</span>
        {navItems.map(({ id, label, icon: Icon, badge }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); close() }}><Icon size={18} /><span>{label}</span>{badge && <em>{badge}</em>}</button>)}
        <span className="nav-label nav-label-spaced">Manage</span>
        <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => { setView('settings'); close() }}><Settings2 size={18} /><span>Settings</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sync-card"><div className="sync-icon"><Zap size={15} /></div><div><strong>All changes synced</strong><small>Saved locally · just now</small></div><Check size={15} className="sync-check" /></div>
        <div className="profile"><div className="profile-avatar">JD</div><div><strong>Jordan Davis</strong><small>Product designer</small></div><button className="icon-button" aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
  </>
}

type BoardProps = {
  applications: Application[]
  onSelect: (application: Application) => void
  onMove: (id: string, stage: Stage) => void
  draggedId: string | null
  setDraggedId: (id: string | null) => void
}

function Dashboard({ applications, counts, activeApplications, onCreate, onSelect, onMove, onViewAll, draggedId, setDraggedId }: BoardProps & { counts: Record<Stage, number>; activeApplications: Application[]; onCreate: () => void; onViewAll: () => void }) {
  const next = [...applications].filter((app) => app.stage !== 'rejected' && app.nextActionDate).sort((a, b) => (a.nextActionDate ?? '').localeCompare(b.nextActionDate ?? ''))[0]
  const interviewCount = applications.filter((app) => app.stage === 'interview').length
  return <>
    <section className="page-heading dashboard-heading">
      <div><p className="eyebrow">Saturday, October 18, 2026 <span className="live-dot" /> Live workspace</p><h1>Good morning, Jordan <span className="wave">✦</span></h1><p className="subtitle">A clear view of your search, so you can focus on the next right move.</p></div>
      <button className="primary-button" onClick={onCreate}><Plus size={17} /> Add application</button>
    </section>
    <div className="stat-grid">
      <StatCard label="Active applications" value={String(activeApplications.length)} detail="+2 this month" positive icon={<BriefcaseBusiness size={18} />} tint="mint" />
      <StatCard label="In progress" value={String(counts.screening + counts.interview)} detail={`${counts.interview} interview${counts.interview === 1 ? '' : 's'} coming up`} icon={<Clock3 size={18} />} tint="blue" />
      <StatCard label="Response rate" value={`${responseRate(applications)}%`} detail="+8% from last month" positive icon={<Target size={18} />} tint="amber" />
      <StatCard label="Next up" value={next ? formatDate(next.nextActionDate) : 'All clear'} detail={next ? next.nextAction : 'No reminders this week'} icon={<CalendarDays size={18} />} tint="lilac" />
    </div>
    <section className="section-block pipeline-section">
      <div className="section-heading"><div><h2>Your pipeline</h2><p>Keep momentum by moving each opportunity forward.</p></div><div className="section-actions"><button className="text-button" onClick={onViewAll}>View all applications <ArrowUpRight size={15} /></button><span className="last-saved"><span className="online-dot" /> Saved locally</span></div></div>
      <PipelineBoard applications={applications} onSelect={onSelect} onMove={onMove} draggedId={draggedId} setDraggedId={setDraggedId} />
    </section>
    <section className="bottom-grid">
      <div className="section-block activity-panel"><div className="section-heading"><div><h2>Recent activity</h2><p>Your latest progress at a glance.</p></div><button className="icon-button" aria-label="More activity options"><MoreHorizontal size={18} /></button></div><ActivityList applications={applications} /></div>
      <div className="section-block focus-panel"><div className="focus-top"><div className="focus-icon"><Sparkles size={18} /></div><span>Weekly focus</span><MoreHorizontal size={17} /></div><h3>Small steps compound.</h3><p>You've made progress on <strong>{interviewCount + counts.offer} promising conversations</strong> this week. Keep the rhythm going.</p><div className="focus-progress"><span style={{ width: `${Math.min(100, 35 + interviewCount * 15)}%` }} /></div><div className="focus-footer"><span>Weekly goal</span><strong>{Math.min(5, interviewCount + counts.offer)} / 5 actions</strong></div></div>
    </section>
  </>
}

function StatCard({ label, value, detail, positive, icon, tint }: { label: string; value: string; detail: string; positive?: boolean; icon: ReactNode; tint: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tint}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className={`stat-detail ${positive ? 'positive' : ''}`}>{positive && <ArrowUpRight size={13} />}{detail}</div></article>
}

function PipelineBoard({ applications, onSelect, onMove, draggedId, setDraggedId }: BoardProps) {
  return <div className="pipeline-board">{STAGES.map((stage) => {
    const columnApps = applications.filter((app) => app.stage === stage.id)
    return <div className={`pipeline-column ${draggedId ? 'drag-active' : ''}`} key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) onMove(draggedId, stage.id); setDraggedId(null) }}>
      <div className="column-header"><div><span className="stage-dot" style={{ background: stage.color }} /><h3>{stage.label}</h3><span className="count-badge">{columnApps.length}</span></div><button className="column-more icon-button" aria-label={`${stage.label} options`}><MoreHorizontal size={16} /></button></div>
      <div className="column-cards">{columnApps.map((app) => <ApplicationCard key={app.id} application={app} onSelect={onSelect} onMove={onMove} onDragStart={() => setDraggedId(app.id)} onDragEnd={() => setDraggedId(null)} />)}{columnApps.length === 0 && <div className="empty-column"><span>Drop an application here</span></div>}</div>
      {stage.id === 'applied' && <div className="column-hint"><Plus size={14} /> Drag cards between stages</div>}
    </div>
  })}</div>
}

function ApplicationCard({ application, onSelect, onMove, onDragStart, onDragEnd }: { application: Application; onSelect: (application: Application) => void; onMove: (id: string, stage: Stage) => void; onDragStart: () => void; onDragEnd: () => void }) {
  return <article className="application-card" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => onSelect(application)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(application) }} aria-label={`Open ${application.company} ${application.role}`}>
    <div className="card-topline"><div className="company-logo" style={{ background: application.color }}>{application.logo}</div><div className="card-company"><strong>{application.company}</strong><span>{application.role}</span></div><button className="drag-handle icon-button" aria-label={`Drag ${application.company}`} onClick={(event) => event.stopPropagation()}><GripVertical size={16} /></button></div>
    <div className="card-meta"><span><MapPin size={12} /> {application.location.split(' · ')[0]}</span><span className="work-type">{application.workType}</span></div>
    <div className="card-bottom"><span className="next-action"><Clock3 size={12} /> {application.nextAction}</span><label className="card-move"><span className="sr-only">Move {application.company} to stage</span><select aria-label={`Move ${application.company} to stage`} value={application.stage} onClick={(event) => event.stopPropagation()} onChange={(event) => onMove(application.id, event.target.value as Stage)}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.short}</option>)}</select><ChevronDown size={10} /></label></div>
  </article>
}

function ActivityList({ applications }: { applications: Application[] }) {
  const seededIds = new Set(seedActivities.map((activity) => activity.applicationId))
  const newActivities = applications.filter((app) => !seededIds.has(app.id)).map((app) => ({ id: `dynamic-${app.id}`, applicationId: app.id, type: 'created' as const, text: `Added ${app.company} to your pipeline`, date: app.lastUpdated }))
  const activities = [...newActivities, ...seedActivities].map((activity) => ({ ...activity, application: applications.find((app) => app.id === activity.applicationId) })).filter((item) => item.application)
  return <div className="activity-list">{activities.slice(0, 4).map((activity) => <div className="activity-row" key={activity.id}><div className={`activity-marker ${activity.type}`}><Activity size={14} /></div><div><strong>{activity.text}</strong><span>{formatDate(activity.date)} · {activity.application?.company}</span></div><ArrowRight size={14} className="activity-arrow" /></div>)}</div>
}

type ApplicationsViewProps = BoardProps & {
  allApplications: Application[]
  search: string
  setSearch: (value: string) => void
  stageFilter: Stage | 'all'
  setStageFilter: (value: Stage | 'all') => void
  layout: 'board' | 'list'
  setLayout: (value: 'board' | 'list') => void
  onCreate: () => void
  onDelete: (id: string) => void
}

function ApplicationsView({ applications, allApplications, search, setSearch, stageFilter, setStageFilter, layout, setLayout, onCreate, onSelect, onMove, onDelete, draggedId, setDraggedId }: ApplicationsViewProps) {
  return <>
    <section className="page-heading applications-heading"><div><p className="eyebrow">Workspace / Applications</p><h1>Applications</h1><p className="subtitle">{allApplications.length} opportunities in your search, organized your way.</p></div><button className="primary-button" onClick={onCreate}><Plus size={17} /> Add application</button></section>
    <section className="section-block applications-panel"><div className="application-toolbar"><div className="toolbar-search"><Search size={16} /><input aria-label="Filter applications" placeholder="Search by company, role, or tag" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="toolbar-divider" /><label className="filter-select"><Filter size={15} /><span className="sr-only">Filter by stage</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as Stage | 'all')}><option value="all">All stages</option>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select><ChevronDown size={14} /></label><div className="view-toggle" role="group" aria-label="View layout"><button className={layout === 'board' ? 'active' : ''} aria-label="Board view" onClick={() => setLayout('board')}><Kanban size={16} /></button><button className={layout === 'list' ? 'active' : ''} aria-label="List view" onClick={() => setLayout('list')}><List size={16} /></button></div></div>{applications.length === 0 ? <EmptyState onCreate={onCreate} /> : layout === 'board' ? <PipelineBoard applications={applications} onSelect={onSelect} onMove={onMove} draggedId={draggedId} setDraggedId={setDraggedId} /> : <ApplicationTable applications={applications} onSelect={onSelect} onMove={onMove} onDelete={onDelete} />}</section>
  </>
}

function ApplicationTable({ applications, onSelect, onMove, onDelete }: { applications: Application[]; onSelect: (application: Application) => void; onMove: (id: string, stage: Stage) => void; onDelete: (id: string) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Company</th><th>Stage</th><th>Next action</th><th>Applied</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{applications.map((app) => <tr key={app.id} onClick={() => onSelect(app)}><td><div className="table-company"><span className="company-logo small" style={{ background: app.color }}>{app.logo}</span><div><strong>{app.company}</strong><span>{app.role}</span></div></div></td><td><label className="table-stage"><span className="stage-dot" style={{ background: stageColor(app.stage) }} /><select aria-label={`Stage for ${app.company}`} value={app.stage} onChange={(event) => onMove(app.id, event.target.value as Stage)} onClick={(event) => event.stopPropagation()}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label></td><td><span className="table-action"><Clock3 size={13} />{app.nextAction}</span></td><td>{formatDate(app.appliedDate)}</td><td><button className="icon-button danger-hover" aria-label={`Delete ${app.company}`} onClick={(event) => { event.stopPropagation(); onDelete(app.id) }}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-state"><div className="empty-state-icon"><BriefcaseBusiness size={24} /></div><h3>No applications found</h3><p>Try changing your search or add a new opportunity to get started.</p><button className="secondary-button" onClick={onCreate}><Plus size={16} /> Add application</button></div>
}

function Insights({ applications, counts }: { applications: Application[]; counts: Record<Stage, number> }) {
  const stageData = stageChartData(applications)
  const weekly = weeklyActivityData(applications)
  const colors = STAGES.map((stage) => stage.color)
  return <>
    <section className="page-heading"><div><p className="eyebrow">Workspace / Insights</p><h1>Your search, decoded</h1><p className="subtitle">Patterns that help you spend your energy where it matters.</p></div><button className="secondary-button"><CalendarDays size={16} /> Last 30 days <ChevronDown size={14} /></button></section>
    <div className="insights-grid"><section className="section-block chart-panel large-chart"><div className="section-heading"><div><h2>Activity over time</h2><p>Applications and conversations you started.</p></div><div className="chart-legend"><span><i className="legend-dot mint" /> Applications</span><span><i className="legend-dot blue" /> Interviews</span></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} barGap={9}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }} cursor={{ fill: 'var(--surface-muted)' }} /><Bar dataKey="applied" name="Applications" fill="#64b89e" radius={[4, 4, 0, 0]} /><Bar dataKey="interviews" name="Interviews" fill="#7295d4" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section><section className="section-block chart-panel stage-chart"><div className="section-heading"><div><h2>Pipeline health</h2><p>Where opportunities sit today.</p></div></div><div className="donut-wrap"><ResponsiveContainer width="58%" height={180}><PieChart><Pie data={stageData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={4} stroke="none">{stageData.map((entry, index) => <Cell key={entry.stage} fill={colors[index]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-total"><strong>{applications.length}</strong><span>Total</span></div></div><div className="stage-legend">{stageData.map((entry, index) => <div key={entry.stage}><span><i style={{ background: colors[index] }} />{entry.name}</span><strong>{entry.value}</strong></div>)}</div></section></div>
    <div className="insights-lower"><section className="section-block metrics-panel"><div className="section-heading"><div><h2>Conversion snapshot</h2><p>How your funnel is moving.</p></div><span className="trend-pill"><ArrowUpRight size={13} /> Trending up</span></div><div className="conversion-row"><ConversionMetric label="Applied" value={String(counts.applied)} percent={100} color="#6d7f92" /><ArrowRight size={16} /><ConversionMetric label="Screening" value={String(counts.screening)} percent={counts.applied ? Math.round((counts.screening / counts.applied) * 100) : 0} color="#d18b3d" /><ArrowRight size={16} /><ConversionMetric label="Interview" value={String(counts.interview)} percent={counts.screening ? Math.round((counts.interview / counts.screening) * 100) : 0} color="#4b77c5" /><ArrowRight size={16} /><ConversionMetric label="Offer" value={String(counts.offer)} percent={counts.interview ? Math.round((counts.offer / counts.interview) * 100) : 0} color="#3d9b80" /></div></section><section className="section-block insight-callout"><div className="callout-icon"><Sparkles size={18} /></div><div><span className="eyebrow">A helpful nudge</span><h3>Your interview rate is strong</h3><p>Keep prioritizing roles where your portfolio has a direct story. That's where your momentum is clearest.</p></div></section></div>
  </>
}

function ConversionMetric({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return <div className="conversion-metric"><div className="conversion-label"><span className="stage-dot" style={{ background: color }} />{label}</div><strong>{value}</strong><small>{percent}% of previous</small></div>
}

function Settings({ theme, setTheme, onReset }: { theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void; onReset: () => void }) {
  const [resetting, setResetting] = useState(false)
  const reset = async () => { setResetting(true); await onReset(); setResetting(false) }
  return <>
    <section className="page-heading"><div><p className="eyebrow">Workspace / Settings</p><h1>Settings</h1><p className="subtitle">Make ApplyTrack feel like yours.</p></div></section>
    <div className="settings-grid"><section className="section-block settings-card"><div className="section-heading"><div><h2>Appearance</h2><p>Choose how your workspace looks.</p></div></div><div className="setting-row"><div><strong>Color theme</strong><span>Light is crisp, dark is easy on the eyes.</span></div><div className="theme-toggle" role="group" aria-label="Color theme"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={15} /> Light</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={15} /> Dark</button></div></div></section><section className="section-block settings-card"><div className="section-heading"><div><h2>Local workspace</h2><p>Your data stays in this browser.</p></div><div className="privacy-badge"><WifiOff size={14} /> Offline ready</div></div><div className="setting-row"><div><strong>Reset demo data</strong><span>Restore the original ApplyTrack examples.</span></div><button className="secondary-button" onClick={() => void reset()} disabled={resetting}><RotateCcw size={15} className={resetting ? 'spin' : ''} /> {resetting ? 'Restoring…' : 'Restore data'}</button></div></section><section className="section-block settings-card"><div className="section-heading"><div><h2>Account</h2><p>Your profile for this workspace.</p></div></div><div className="account-row"><div className="profile-avatar large">JD</div><div><strong>Jordan Davis</strong><span>jordan@example.com</span></div><button className="secondary-button small-button">Edit profile</button></div></section></div>
  </>
}

function ApplicationDrawer({ application, onClose, onEdit, onMove, onDelete, onSaveNote }: { application: Application; onClose: () => void; onEdit: () => void; onMove: (id: string, stage: Stage) => void; onDelete: () => void; onSaveNote: (notes: string) => void }) {
  const [notes, setNotes] = useState(application.notes ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setNotes(application.notes ?? ''), [application.id, application.notes])
  return <><button className="drawer-backdrop" aria-label="Close application details" onClick={onClose} /><aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`${application.company} details`}><div className="drawer-header"><span className="eyebrow">Application details</span><div><button className="icon-button" aria-label="Edit application" onClick={onEdit}><Pencil size={17} /></button><button className="icon-button" aria-label="Close details" onClick={onClose}><X size={18} /></button></div></div><div className="drawer-company"><div className="company-logo large-logo" style={{ background: application.color }}>{application.logo}</div><div><h2>{application.company}</h2><p>{application.role}</p></div></div><div className="drawer-status-row"><label className="drawer-select"><span>Status</span><select value={application.stage} onChange={(event) => onMove(application.id, event.target.value as Stage)}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select><ChevronDown size={14} /></label><span className="updated-label">Updated {formatDate(application.lastUpdated)}</span></div><div className="detail-list"><DetailItem icon={<MapPin size={15} />} label="Location" value={`${application.location} · ${application.workType}`} /><DetailItem icon={<Target size={15} />} label="Salary range" value={application.salary} /><DetailItem icon={<CalendarDays size={15} />} label="Applied" value={formatDate(application.appliedDate)} /><DetailItem icon={<UserRound size={15} />} label="Contact" value={application.contact || 'Not added'} /></div>{application.url && <a className="job-link" href={application.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> View job posting</a>}<div className="drawer-section"><div className="drawer-section-title"><h3>Next action</h3><span className="date-pill"><Clock3 size={13} />{formatDate(application.nextActionDate)}</span></div><div className="next-action-box"><CheckCircle2 size={16} /><span>{application.nextAction}</span></div></div><div className="drawer-section notes-section"><div className="drawer-section-title"><h3>Notes</h3><button className="text-button" onClick={() => onSaveNote(notes)}>Save</button></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Capture context for your future self…" aria-label="Application notes" /></div><div className="tag-list">{application.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="drawer-footer"><div className="menu-wrap"><button className="secondary-button danger-button" onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={16} /> More</button>{menuOpen && <div className="popover"><button onClick={onDelete}><Trash2 size={14} /> Delete application</button></div>}</div><button className="primary-button" onClick={onEdit}><Pencil size={15} /> Edit application</button></div></aside></>
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="detail-item"><span className="detail-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></div>
}

function ApplicationModal({ mode, application, onClose, onSave }: { mode: 'create' | 'edit'; application: Application | null; onClose: () => void; onSave: (application: Application, editing: boolean) => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: application ? { company: application.company, role: application.role, stage: application.stage, location: application.location, workType: application.workType, salary: application.salary, appliedDate: application.appliedDate, nextAction: application.nextAction, nextActionDate: application.nextActionDate ?? '', url: application.url ?? '' } : { company: '', role: '', stage: 'applied', location: '', workType: 'Remote', salary: '', appliedDate: today, nextAction: '', nextActionDate: '', url: '' },
  })
  const [submitError, setSubmitError] = useState('')
  useEffect(() => {
    reset(application ? { company: application.company, role: application.role, stage: application.stage, location: application.location, workType: application.workType, salary: application.salary, appliedDate: application.appliedDate, nextAction: application.nextAction, nextActionDate: application.nextActionDate ?? '', url: application.url ?? '' } : { company: '', role: '', stage: 'applied', location: '', workType: 'Remote', salary: '', appliedDate: today, nextAction: '', nextActionDate: '', url: '' })
  }, [application, reset])
  const submit = (values: FormValues) => {
    try {
      const parsed = applicationSchema.parse(values)
      const existing = application
      onSave({ ...(existing ?? { id: uid(), tags: [], logo: parsed.company.charAt(0).toUpperCase(), color: '#3d9b80' }), ...parsed, lastUpdated: today }, Boolean(existing))
    } catch { setSubmitError('Please check the highlighted fields and try again.') }
  }
  return <><button className="modal-backdrop" aria-label="Close application form" onClick={onClose} /><section className="modal" role="dialog" aria-modal="true" aria-labelledby="application-form-title"><div className="modal-header"><div><span className="eyebrow">{mode === 'edit' ? 'Edit opportunity' : 'New opportunity'}</span><h2 id="application-form-title">{mode === 'edit' ? 'Update application' : 'Add an application'}</h2><p>Keep the details that help future-you take the next step.</p></div><button className="icon-button" aria-label="Close form" onClick={onClose}><X size={19} /></button></div><form onSubmit={(event) => { void handleSubmit(submit)(event) }}><div className="form-grid"><Field label="Company" error={errors.company?.message} required><input {...register('company')} placeholder="e.g. Figma" autoFocus /></Field><Field label="Role" error={errors.role?.message} required><input {...register('role')} placeholder="e.g. Product Designer" /></Field><Field label="Stage" error={errors.stage?.message}><div className="select-wrap"><select {...register('stage')}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select><ChevronDown size={15} /></div></Field><Field label="Location" error={errors.location?.message} required><div className="input-with-icon"><MapPin size={15} /><input {...register('location')} placeholder="e.g. Remote · US" /></div></Field><Field label="Work style"><div className="select-wrap"><select {...register('workType')}><option>Remote</option><option>Hybrid</option><option>On-site</option></select><ChevronDown size={15} /></div></Field><Field label="Salary range" error={errors.salary?.message} required><input {...register('salary')} placeholder="e.g. $150k – $180k" /></Field><Field label="Applied date" error={errors.appliedDate?.message} required><div className="input-with-icon"><CalendarDays size={15} /><input type="date" {...register('appliedDate')} /></div></Field><Field label="Job link"><div className="input-with-icon"><ExternalLink size={15} /><input type="url" {...register('url')} placeholder="https://…" /></div></Field><Field label="Next action" error={errors.nextAction?.message} required full><input {...register('nextAction')} placeholder="e.g. Send portfolio follow-up" /></Field><Field label="Action date" full><div className="input-with-icon"><CalendarDays size={15} /><input type="date" {...register('nextActionDate')} /></div></Field></div>{submitError && <p className="form-error-banner"><CircleAlert size={15} />{submitError}</p>}<div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add to pipeline'} <ArrowRight size={15} /></button></div></form></section></>
}

function Field({ label, error, required, full, children }: { label: string; error?: string; required?: boolean; full?: boolean; children: ReactNode }) {
  return <label className={`form-field ${full ? 'full' : ''}`}><span>{label}{required && <em> *</em>}</span>{children}{error && <small className="field-error">{error}</small>}</label>
}

export default App
