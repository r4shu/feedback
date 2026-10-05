import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ArrowUp, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Lightbulb, LogIn, LogOut, MessageSquareText, Plus, Search, Send, Settings2, Sparkles, X } from 'lucide-react'
import './styles.css'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = url && key ? createClient(url, key) : null
const categories = ['All ideas', 'Feature', 'Improvement', 'Bug']
const statuses = ['open', 'planned', 'in_progress', 'completed']
const statusNames = { open: 'Open', planned: 'Planned', in_progress: 'In progress', completed: 'Complete' }
const examples = [
  { id: 'demo-1', title: 'Let me save a draft before submitting', description: 'Sometimes I need to gather details from my team before I can write a useful request. A draft would help me come back to it later.', category: 'Improvement', status: 'planned', author_name: 'Morgan L.', votes_count: 28, created_at: '2026-09-28T10:30:00Z' },
  { id: 'demo-2', title: 'Keyboard shortcuts for the inbox', description: 'It would be great to move through feedback without reaching for the mouse every time.', category: 'Feature', status: 'in_progress', author_name: 'Alex Chen', votes_count: 19, created_at: '2026-09-27T14:12:00Z' },
  { id: 'demo-3', title: 'Export a filtered feedback list', description: 'A CSV export for the current search and filters would make sharing themes with stakeholders much easier.', category: 'Feature', status: 'open', author_name: 'Jamie R.', votes_count: 14, created_at: '2026-09-25T08:10:00Z' },
  { id: 'demo-4', title: 'The date filter resets after refresh', description: 'When I refresh the page, my selected date range disappears and I have to set it again.', category: 'Bug', status: 'open', author_name: 'Sam Patel', votes_count: 9, created_at: '2026-09-23T16:45:00Z' },
  { id: 'demo-5', title: 'Show who is working on a request', description: 'A small owner label would help us know who to contact when we have more context to share.', category: 'Improvement', status: 'completed', author_name: 'Taylor W.', votes_count: 7, created_at: '2026-09-19T11:20:00Z' },
]

function getVoterId() {
  let id = localStorage.getItem('signal-voter-id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('signal-voter-id', id) }
  return id
}

function getPreviewIdeas() {
  const saved = localStorage.getItem('signal-preview-ideas')
  if (saved) {
    try { return JSON.parse(saved) } catch { localStorage.removeItem('signal-preview-ideas') }
  }
  localStorage.setItem('signal-preview-ideas', JSON.stringify(examples))
  return examples
}

function timeAgo(value) {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 3600000))
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function AdminLoginDialog({ preview, onClose, onSubmit }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button className="dialog-close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <div className="dialog-mark"><Settings2 size={18} /></div>
      <div className="dialog-kicker">WORKSPACE ACCESS</div>
      <h2 id="login-title">Admin sign in</h2>
      <p className="dialog-intro">Sign in with your workspace admin account to manage feedback.</p>
      {preview && <div className="setup-callout" role="status">
        <CircleHelp size={17} />
        <span><strong>Connect Supabase to enable sign-in</strong><br />Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, run <code>supabase/schema.sql</code>, then add your user to <code>feedback_admins</code>.</span>
      </div>}
      <form onSubmit={onSubmit} className="feedback-form">
        <label>Email<input name="email" type="email" required autoComplete="username" placeholder="you@company.com" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="Your password" /></label>
        <button className="primary-button form-submit" type="submit"><LogIn size={15} />Sign in</button>
      </form>
    </section>
  </div>
}

export default function App() {
  const [ideas, setIdeas] = useState(() => supabase ? [] : getPreviewIdeas())
  const [loading, setLoading] = useState(Boolean(supabase))
  const [category, setCategory] = useState('All ideas')
  const [sort, setSort] = useState('Most votes')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState('')
  const [toast, setToast] = useState('')
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [votedIds, setVotedIds] = useState(() => JSON.parse(localStorage.getItem('signal-voted-ids') || '[]'))
  const [submitting, setSubmitting] = useState(false)
  const preview = !supabase

  const loadIdeas = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    if (error) { setToast(error.message); setIdeas([]) }
    else setIdeas(data ?? [])
    setLoading(false)
  }

  const loadAdmin = async (user) => {
    if (!supabase || !user) { setIsAdmin(false); return }
    const { data } = await supabase.from('feedback_admins').select('user_id').eq('user_id', user.id).maybeSingle()
    setIsAdmin(Boolean(data))
  }

  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadAdmin(data.session?.user); loadIdeas() })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      window.setTimeout(() => loadAdmin(nextSession?.user), 0)
    })
    const channel = supabase.channel('feedback-board').on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, loadIdeas).subscribe()
    return () => { listener.subscription.unsubscribe(); supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3800)
    return () => clearTimeout(timer)
  }, [toast])

  const shownIdeas = useMemo(() => ideas
    .filter((idea) => category === 'All ideas' || idea.category === category)
    .filter((idea) => !search.trim() || `${idea.title} ${idea.description} ${idea.author_name}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === 'Most votes' ? b.votes_count - a.votes_count : new Date(b.created_at) - new Date(a.created_at)), [ideas, category, search, sort])
  const planned = ideas.filter((idea) => idea.status === 'planned' || idea.status === 'in_progress').length
  const shipped = ideas.filter((idea) => idea.status === 'completed').length

  const submitIdea = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const idea = { title: String(form.get('title')).trim(), description: String(form.get('description')).trim(), category: String(form.get('category')), author_name: String(form.get('author_name')).trim() || 'Community member' }
    setSubmitting(true)
    if (preview) {
      const next = [{ ...idea, id: crypto.randomUUID(), status: 'open', votes_count: 0, created_at: new Date().toISOString() }, ...ideas]
      localStorage.setItem('signal-preview-ideas', JSON.stringify(next))
      setIdeas(next)
    } else {
      const { data, error } = await supabase.from('feedback').insert(idea).select().single()
      if (error) { setToast(error.message); setSubmitting(false); return }
      setIdeas((current) => [data, ...current])
    }
    setSubmitting(false); setModal(''); setToast('Your feedback is on the board. Thanks for sharing.')
  }

  const toggleVote = async (idea) => {
    const voted = votedIds.includes(idea.id)
    if (preview) {
      const nextVoted = voted ? votedIds.filter((id) => id !== idea.id) : [...votedIds, idea.id]
      const nextIdeas = ideas.map((item) => item.id === idea.id ? { ...item, votes_count: Math.max(0, item.votes_count + (voted ? -1 : 1)) } : item)
      setVotedIds(nextVoted); setIdeas(nextIdeas)
      localStorage.setItem('signal-voted-ids', JSON.stringify(nextVoted)); localStorage.setItem('signal-preview-ideas', JSON.stringify(nextIdeas))
      return
    }
    const { data, error } = await supabase.rpc('toggle_feedback_vote', { p_feedback_id: idea.id, p_voter_id: getVoterId() })
    if (error) { setToast(error.message); return }
    const nextVoted = data ? [...new Set([...votedIds, idea.id])] : votedIds.filter((id) => id !== idea.id)
    setVotedIds(nextVoted); localStorage.setItem('signal-voted-ids', JSON.stringify(nextVoted)); await loadIdeas()
  }

  const changeStatus = async (id, status) => {
    const { data, error } = await supabase.from('feedback').update({ status }).eq('id', id).select().single()
    if (error) { setToast(error.message); return }
    setIdeas((current) => current.map((idea) => idea.id === id ? data : idea)); setToast('Status updated.')
  }

  const signIn = async (event) => {
    event.preventDefault()
    if (!supabase) { setToast('Configure Supabase before signing in.'); return }
    const form = new FormData(event.currentTarget)
    const { error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') })
    if (error) { setToast(error.message); return }
    setModal(''); setToast('Signed in successfully.')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="Signal home"><span className="brand-mark"><span /></span><span>signal<span className="brand-period">.</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-picker"><span className="workspace-avatar">N</span><span className="workspace-name">Northstar Studio<small>Product feedback</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation"><a className="side-link active" href="#board"><MessageSquareText size={17} /> Feedback board <span className="nav-count">{ideas.length}</span></a><a className="side-link" href="#board" onClick={() => setSort('Most votes')}><Lightbulb size={17} /> Roadmap <ArrowUpRight className="external-icon" size={14} /></a></nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><div className="note-icon"><Sparkles size={15} /></div><p>Good ideas grow<br />better together.</p><span>Make your voice count.</span></div>
      <button className="profile-button" type="button" onClick={() => session ? supabase.auth.signOut() : setModal('login')}><span className="profile-avatar">{session?.user?.email?.[0]?.toUpperCase() || 'G'}</span><span className="profile-name">{session?.user?.email?.split('@')[0] || 'Guest contributor'}<small>{isAdmin ? 'Workspace admin' : 'Community member'}</small></span>{session ? <LogOut size={16} /> : <Settings2 size={16} />}</button>
    </aside>
    <main className="main-content" id="top">
      <header className="topbar"><div className="breadcrumbs"><span>Northstar Studio</span><span className="crumb-divider">/</span><strong>Feedback board</strong></div><div className="topbar-actions">{preview && <span className="preview-badge"><span /> Preview mode</span>}{session ? <button className="quiet-button" type="button" onClick={() => supabase.auth.signOut()}><LogOut size={15} /> Sign out</button> : <button className="quiet-button" type="button" onClick={() => setModal('login')}><LogIn size={15} /> Admin sign in</button>}<button className="primary-button top-submit" type="button" onClick={() => setModal('submit')}><Plus size={16} /> Share feedback</button></div></header>
      <section className="page-heading" id="board"><div className="heading-copy"><div className="eyebrow"><span className="eyebrow-line" /> LISTEN. BUILD. REPEAT.</div><h1>Make the product<br /><em>better together.</em></h1><p>Share what matters to you. Vote for the ideas you love.<br className="desktop-break" /> See what we're working on next.</p></div><div className="heading-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-note note-one"><span className="art-dot coral" /><span /><span /></div><div className="art-note note-two"><span className="art-dot green" /><span /><span /></div><div className="art-spark">✳</div></div></section>
      <section className="stats-strip" aria-label="Feedback board overview"><div className="stat"><span className="stat-icon idea-stat"><Lightbulb size={16} /></span><span><strong>{ideas.length}</strong><small>ideas shared</small></span></div><div className="stat"><span className="stat-icon plan-stat"><Clock3 size={16} /></span><span><strong>{planned}</strong><small>in the works</small></span></div><div className="stat"><span className="stat-icon shipped-stat"><Check size={16} /></span><span><strong>{shipped}</strong><small>improvements shipped</small></span></div><div className="stat-footnote"><span className="live-dot" /> Updated as we build</div></section>
      {preview && <div className="preview-notice"><CircleHelp size={15} /><span><strong>You're exploring a preview.</strong> Ideas and votes stay in this browser. Connect Supabase to enable shared cloud feedback and admin tools.</span></div>}
      <section className="board-section" aria-label="Community feedback"><div className="board-toolbar"><div className="category-tabs" role="tablist" aria-label="Filter ideas by category">{categories.map((item) => <button key={item} className={`category-tab ${category === item ? 'selected' : ''}`} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="board-tools"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ideas" aria-label="Search ideas" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</label><label className="sort-select"><span className="sort-label">Sort:</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort ideas"><option>Most votes</option><option>Newest</option></select><ChevronDown size={14} /></label></div></div>
        <div className="idea-list">{loading ? <div className="empty-state"><span className="loading-spinner" /> Loading feedback…</div> : shownIdeas.length ? shownIdeas.map((idea) => { const voted = votedIds.includes(idea.id); return <article className="idea-row" key={idea.id}><button className={`vote-button ${voted ? 'voted' : ''}`} type="button" onClick={() => toggleVote(idea)} aria-label={`${voted ? 'Remove vote from' : 'Vote for'} ${idea.title}`} aria-pressed={voted}><ArrowUp size={16} /><strong>{idea.votes_count}</strong></button><div className="idea-body"><div className="idea-title-line"><h2>{idea.title}</h2><span className={`status-pill status-${idea.status}`}>{statusNames[idea.status] || 'Open'}</span></div><p className="idea-description">{idea.description}</p><div className="idea-meta"><span className={`category-label category-${idea.category.toLowerCase()}`}>{idea.category}</span><span className="meta-divider" /><span>{idea.author_name || 'Community member'}</span><span className="meta-divider" /><span>{timeAgo(idea.created_at)}</span></div></div>{isAdmin && <label className="admin-status"><span className="sr-only">Update status</span><select value={idea.status} onChange={(event) => changeStatus(idea.id, event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{statusNames[item]}</option>)}</select><ChevronDown size={13} /></label>}</article> }) : <div className="empty-state"><div className="empty-icon"><MessageSquareText size={20} /></div><strong>{search ? 'No ideas match that search.' : 'Nothing here just yet.'}</strong><span>{search ? 'Try another phrase or clear your search.' : 'Be the first to share an idea with the community.'}</span>{!search && <button className="text-action" type="button" onClick={() => setModal('submit')}>Share the first idea <ArrowUpRight size={14} /></button>}</div>}</div>
        <div className="list-footer"><span>Showing {shownIdeas.length} of {ideas.length} ideas</span><span>Have an idea? <button type="button" onClick={() => setModal('submit')}>We’re listening <ArrowUpRight size={13} /></button></span></div>
      </section>
      <footer className="page-footer"><span>Built with care by Northstar Studio</span><a href="mailto:hello@northstar.example">Questions? Get in touch <ArrowUpRight size={12} /></a></footer>
    </main>
    {modal === 'submit' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal('') }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button className="dialog-close" type="button" onClick={() => setModal('')} aria-label="Close"><X size={18} /></button><div className="dialog-mark"><Lightbulb size={19} /></div><div className="dialog-kicker">YOUR VOICE MATTERS</div><h2 id="submit-title">Share an idea</h2><p className="dialog-intro">Tell us what's on your mind. The more detail, the better.</p><form onSubmit={submitIdea} className="feedback-form"><label>Idea title<input name="title" required minLength="3" maxLength="120" placeholder="A short, clear summary" /></label><label>Tell us more<textarea name="description" required minLength="3" maxLength="2000" rows="4" placeholder="What would you like to see? How would it help?" /></label><div className="form-row"><label>Category<select name="category"><option>Feature</option><option>Improvement</option><option>Bug</option></select></label><label>Your name <span className="optional">(optional)</span><input name="author_name" maxLength="60" placeholder="How should we credit you?" /></label></div>{preview && <div className="form-hint"><CircleHelp size={14} /> Preview submissions are saved only in this browser.</div>}<button className="primary-button form-submit" type="submit" disabled={submitting}><Send size={15} />{submitting ? 'Sharing…' : 'Share feedback'}</button></form></section></div>}
    {modal === 'login' && <AdminLoginDialog preview={preview} onClose={() => setModal('')} onSubmit={signIn} />}
    {toast && <div className="toast" role="status"><span className="toast-check"><Check size={14} /></span>{toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>
}
