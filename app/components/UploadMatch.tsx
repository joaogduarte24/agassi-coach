'use client'
import { useState, useRef, useEffect } from 'react'
import { G, A, R, GD, matchState, makeMatchId,
         FONT_BODY, FONT_DATA, FONT_DISPLAY, BG2, BG3, BORDER, BORDER2, WHITE, MUTED, DIM, GOLD, GOLD_DIM } from '@/app/lib/helpers'

interface UploadMatchProps {
  onMatchAdded: (m: any) => void
  matches?: any[]
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const inp = (extra?: any) => ({
  background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: '10px 14px',
  color: WHITE, fontSize: 14, outline: 'none', fontFamily: FONT_BODY, width: '100%', ...extra
})

// ─── CHIP ─────────────────────────────────────────────────────────────────────
function Chips({ options, value, onChange, multi = false, color = GOLD }: {
  options: string[]; value: string | string[]; onChange: (v: any) => void
  multi?: boolean; color?: string
}) {
  const isActive = (opt: string) => multi ? (value as string[]).includes(opt) : value === opt
  const toggle = (opt: string) => {
    if (multi) {
      const arr = value as string[]
      onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
    } else {
      onChange(value === opt ? '' : opt)
    }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
      {options.map(opt => {
        const active = isActive(opt)
        return (
          <button key={opt} onClick={() => toggle(opt)} style={{
            padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            border: `1px solid ${active ? color : BORDER2}`,
            background: active ? `${color}1a` : BG2,
            color: active ? color : MUTED, cursor: 'pointer',
            fontFamily: FONT_BODY, transition: 'all 0.15s',
          }}>{opt}</button>
        )
      })}
    </div>
  )
}

// ─── DOTS ─────────────────────────────────────────────────────────────────────
function Dots({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(value === i ? 0 : i)} style={{
          width: 44, height: 44, borderRadius: '50%', padding: 0, cursor: 'pointer',
          border: `2px solid ${i <= value ? GOLD : BORDER2}`,
          background: i <= value ? `${GOLD}1a` : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: i <= value ? GOLD : BORDER2, transition: 'all 0.15s' }} />
        </button>
      ))}
    </div>
  )
}

// ─── QUESTION ─────────────────────────────────────────────────────────────────
function Q({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: WHITE, fontFamily: FONT_BODY }}>{label}</span>
        {note && <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_DATA }}>{note}</span>}
      </div>
      {children}
    </div>
  )
}

// ─── SECTION ──────────────────────────────────────────────────────────────────
function JSection({ title, open, onToggle, answered, children }: {
  title: string; open: boolean; onToggle: () => void; answered: number; children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: '14px 0', cursor: 'pointer' }}>
        <span style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: open ? MUTED : DIM }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {answered > 0 && !open && (
            <span style={{ fontSize: 10, color: G, fontFamily: FONT_DATA, background: 'rgba(74,222,128,0.08)', padding: '2px 7px', borderRadius: 10 }}>{answered} answered</span>
          )}
          <span style={{ color: DIM, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
      <div style={{ height: 1, background: BORDER }} />
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SH = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 8 }}>
    {children}
  </div>
)

// ─── JOURNAL FIELDS HOOK ──────────────────────────────────────────────────────
function useJournalFields() {
  const [recoveryPct, setRecoveryPct] = useState('')
  const [matchType, setMatchType] = useState('')
  const [warmup, setWarmup] = useState('')
  const [oppDifficulty, setOppDifficulty] = useState('')
  const [planExecuted, setPlanExecuted] = useState('')
  const [focus, setFocus] = useState(0)
  const [composure, setComposure] = useState(0)
  const [whoopStrain, setWhoopStrain] = useState('')
  const [decidedBy, setDecidedBy] = useState<string[]>([])
  const [priorityNext, setPriorityNext] = useState('')
  const [oppStyle, setOppStyle] = useState('')
  const [oppLefty, setOppLefty] = useState('')
  const [netGame, setNetGame] = useState('')
  const [mentalGame, setMentalGame] = useState('')
  const [oppWeapon, setOppWeapon] = useState('')
  const [oppWeakness, setOppWeakness] = useState('')

  const reset = () => {
    setRecoveryPct(''); setMatchType(''); setWarmup('')
    setOppDifficulty(''); setPlanExecuted(''); setFocus(0); setComposure(0); setWhoopStrain('')
    setDecidedBy([]); setPriorityNext('')
    setOppStyle(''); setOppLefty(''); setNetGame(''); setMentalGame(''); setOppWeapon(''); setOppWeakness('')
  }

  const toData = () => ({
    recovery: recoveryPct !== '' ? Number(recoveryPct) : null,
    match_type: matchType || null,
    warmup: warmup || null,
    opp_difficulty: oppDifficulty || null,
    plan_executed: planExecuted || null,
    focus: focus || null,
    composure: composure || null,
    whoop_strain: whoopStrain !== '' ? Number(whoopStrain) : null,
    decided_by: decidedBy.length ? decidedBy : null,
    priority_next: priorityNext || null,
    opp_style: oppStyle || null,
    opp_lefty: oppLefty === 'yes' ? true : oppLefty === 'no' ? false : null,
    net_game: netGame || null,
    mental_game: mentalGame || null,
    opp_weapon: oppWeapon || null,
    opp_weakness: oppWeakness || null,
  })

  const beforeAnswered = [recoveryPct, matchType, warmup].filter(Boolean).length
  const afterAnswered = [oppDifficulty, planExecuted, focus, composure, whoopStrain, decidedBy.length > 0 ? 1 : 0, priorityNext].filter(Boolean).length
  const oppAnswered = [oppStyle, oppLefty, netGame, mentalGame, oppWeapon, oppWeakness].filter(Boolean).length

  return {
    fields: { recoveryPct, matchType, warmup, oppDifficulty, planExecuted, focus, composure, whoopStrain, decidedBy, priorityNext, oppStyle, oppLefty, netGame, mentalGame, oppWeapon, oppWeakness },
    setters: { setRecoveryPct, setMatchType, setWarmup, setOppDifficulty, setPlanExecuted, setFocus, setComposure, setWhoopStrain, setDecidedBy, setPriorityNext, setOppStyle, setOppLefty, setNetGame, setMentalGame, setOppWeapon, setOppWeakness },
    beforeAnswered, afterAnswered, oppAnswered,
    reset, toData
  }
}

// ─── JOURNAL FORM ─────────────────────────────────────────────────────────────
function JournalForm({ j, showResult, result, setResult, scoreStr, setScoreStr }: any) {
  const { fields, setters, beforeAnswered, afterAnswered, oppAnswered } = j
  const [beforeOpen, setBeforeOpen] = useState(false)
  const [afterOpen, setAfterOpen] = useState(true)
  const [oppOpen, setOppOpen] = useState(false)

  return (
    <div style={{ background: '#111', borderRadius: 14, padding: '4px 16px 8px', border: `1px solid ${BORDER}` }}>
      {/* Result — only in journal-only flow */}
      {showResult && (
        <div style={{ padding: '14px 0 10px', borderBottom: `1px solid ${BORDER}` }}>
          <SH>Result</SH>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['Win', 'Loss'] as const).map(opt => (
              <button key={opt} onClick={() => setResult(result === opt.toLowerCase() ? '' : opt.toLowerCase())}
                style={{ padding: '8px 20px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${result === opt.toLowerCase() ? (opt === 'Win' ? G : R) : BORDER2}`, background: result === opt.toLowerCase() ? (opt === 'Win' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)') : BG2, color: result === opt.toLowerCase() ? (opt === 'Win' ? G : R) : MUTED, cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all 0.15s' }}>
                {opt}
              </button>
            ))}
            <input value={scoreStr} onChange={e => setScoreStr(e.target.value)} placeholder="Score (optional: 6-3 7-5)" style={{ ...inp(), flex: 1, fontSize: 12 }} />
          </div>
        </div>
      )}

      {/* BEFORE */}
      <JSection title="Before the Match" open={beforeOpen} onToggle={() => setBeforeOpen(v => !v)} answered={beforeAnswered}>
        <Q label="Whoop recovery" note="0 – 100%">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" min={0} max={100} placeholder="e.g. 74" value={fields.recoveryPct} onChange={e => setters.setRecoveryPct(e.target.value)}
              style={{ width: 90, background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 8, padding: '9px 12px', color: WHITE, fontSize: 15, outline: 'none', fontFamily: FONT_BODY }} />
            {fields.recoveryPct !== '' && (
              <span style={{ fontSize: 22, fontFamily: FONT_DISPLAY, color: Number(fields.recoveryPct) >= 67 ? G : Number(fields.recoveryPct) >= 34 ? A : R, letterSpacing: 1 }}>{fields.recoveryPct}%</span>
            )}
          </div>
        </Q>
        <Q label="Match type"><Chips options={['Practice', 'League', 'Tournament', 'Friendly']} value={fields.matchType} onChange={setters.setMatchType} /></Q>
        <Q label="Warmup"><Chips options={['Full', 'Light', 'None']} value={fields.warmup} onChange={setters.setWarmup} /></Q>
      </JSection>

      {/* AFTER */}
      <JSection title="After the Match" open={afterOpen} onToggle={() => setAfterOpen(v => !v)} answered={afterAnswered}>
        <Q label="How tough was this opponent?">
          <Chips options={['Easier than me', 'Even', 'Tougher than me', 'Much tougher']} value={fields.oppDifficulty} onChange={setters.setOppDifficulty}
            color={fields.oppDifficulty === 'Much tougher' ? '#c084fc' : fields.oppDifficulty === 'Tougher than me' ? '#60a5fa' : fields.oppDifficulty === 'Even' ? GOLD : G} />
        </Q>
        <Q label="Did you execute your game plan?">
          <Chips options={['Yes', 'Mostly', 'No']} value={fields.planExecuted} onChange={setters.setPlanExecuted}
            color={fields.planExecuted === 'Yes' ? G : fields.planExecuted === 'No' ? R : A} />
        </Q>
        <Q label="Focus during the match" note="1 = scattered · 5 = locked in"><Dots value={fields.focus} onChange={setters.setFocus} /></Q>
        <Q label="Composure on big points" note="1 = shaky · 5 = ice"><Dots value={fields.composure} onChange={setters.setComposure} /></Q>
        <Q label="Whoop match strain" note="0 – 21">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" min={0} max={21} step={0.1} placeholder="e.g. 14.2" value={fields.whoopStrain} onChange={e => setters.setWhoopStrain(e.target.value)}
              style={{ width: 90, background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 8, padding: '9px 12px', color: WHITE, fontSize: 15, outline: 'none', fontFamily: FONT_BODY }} />
            {fields.whoopStrain !== '' && (
              <span style={{ fontSize: 22, fontFamily: FONT_DISPLAY, color: Number(fields.whoopStrain) >= 14 ? R : Number(fields.whoopStrain) >= 10 ? A : G, letterSpacing: 1 }}>{fields.whoopStrain}</span>
            )}
          </div>
        </Q>
        <Q label="What decided the match?" note="pick any">
          <Chips options={['My serve', 'My return', 'My errors', 'Their level', 'Pressure moments', 'Fitness', 'Luck']} value={fields.decidedBy} onChange={setters.setDecidedBy} multi />
        </Q>
        <Q label="Top priority for next match with this opponent">
          <Chips options={['Serve %', 'Reduce UE', 'Return depth', 'BP conversion', 'Footwork', 'Composure', 'Aggression']} value={fields.priorityNext} onChange={setters.setPriorityNext} color='#60a5fa' />
        </Q>
      </JSection>

      {/* OPPONENT */}
      <JSection title="Opponent" open={oppOpen} onToggle={() => setOppOpen(v => !v)} answered={oppAnswered}>
        <Q label="Playing style"><Chips options={['Baseliner', 'Serve & Volleyer', 'All-Court', 'Pusher', 'Big Server', 'Moonballer']} value={fields.oppStyle} onChange={setters.setOppStyle} color='#c084fc' /></Q>
        <Q label="Handedness">
          <Chips options={['Right-handed', 'Lefty']} value={fields.oppLefty === 'yes' ? 'Lefty' : fields.oppLefty === 'no' ? 'Right-handed' : ''}
            onChange={v => setters.setOppLefty(v === 'Lefty' ? 'yes' : v === 'Right-handed' ? 'no' : '')} color='#c084fc' />
        </Q>
        <Q label="Net game"><Chips options={['Stays back', 'Comes to net', 'Chip & charge']} value={fields.netGame} onChange={setters.setNetGame} color='#c084fc' /></Q>
        <Q label="Mental game"><Chips options={['Crumbles under pressure', 'Steady', 'Ice cold']} value={fields.mentalGame} onChange={setters.setMentalGame} color='#c084fc' /></Q>
        <Q label="Their weapon"><Chips options={['Serve', 'Forehand', 'Backhand', 'Volley', 'Movement']} value={fields.oppWeapon} onChange={setters.setOppWeapon} color='#c084fc' /></Q>
        <Q label="Their weakness"><Chips options={['Serve', 'Backhand', 'Movement', 'Second ball']} value={fields.oppWeakness} onChange={setters.setOppWeakness} color='#c084fc' /></Q>
      </JSection>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function UploadMatch({ onMatchAdded, matches = [] }: UploadMatchProps) {
  // Entry state
  const [step, setStep] = useState<'entry' | 'branch' | 'journal' | 'upload'>('entry')
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')
  const [surface, setSurface] = useState('Clay')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [existingMatch, setExistingMatch] = useState<any>(null)

  // Journal state
  const j = useJournalFields()
  const [result, setResult] = useState('')
  const [scoreStr, setScoreStr] = useState('')

  // Upload state
  const [jdImg,   setJdImg]   = useState<File | null>(null)
  const [oppImg,  setOppImg]  = useState<File | null>(null)
  const [matchImg,setMatchImg]= useState<File | null>(null)
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [xlsxPreview, setXlsxPreview] = useState<{ shots: number; points: number } | null>(null)
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false)
  const [overwriteConfirmed,  setOverwriteConfirmed]   = useState(false)
  const [pendingMatch, setPendingMatch] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef    = useRef<HTMLInputElement>(null)
  const jdRef      = useRef<HTMLInputElement>(null)
  const oppRef     = useRef<HTMLInputElement>(null)
  const matchRef   = useRef<HTMLInputElement>(null)

  // Pre-fill journal form from existingMatch.journal when entering edit mode
  useEffect(() => {
    if (step !== 'journal' || !existingMatch?.journal) return
    const jj = existingMatch.journal
    const s = j.setters
    if (jj.recovery     != null) s.setRecoveryPct(String(jj.recovery))
    if (jj.match_type)           s.setMatchType(jj.match_type)
    if (jj.warmup)               s.setWarmup(jj.warmup)
    if (jj.opp_difficulty)       s.setOppDifficulty(jj.opp_difficulty)
    if (jj.plan_executed)        s.setPlanExecuted(jj.plan_executed)
    if (jj.focus)                s.setFocus(jj.focus)
    if (jj.composure)            s.setComposure(jj.composure)
    if (jj.whoop_strain != null) s.setWhoopStrain(String(jj.whoop_strain))
    if (jj.decided_by?.length)   s.setDecidedBy(jj.decided_by)
    if (jj.priority_next)        s.setPriorityNext(jj.priority_next)
    if (jj.opp_style)            s.setOppStyle(jj.opp_style)
    if (jj.opp_lefty   != null)  s.setOppLefty(jj.opp_lefty ? 'yes' : 'no')
    if (jj.net_game)             s.setNetGame(jj.net_game)
    if (jj.mental_game)          s.setMentalGame(jj.mental_game)
    if (jj.opp_weapon)           s.setOppWeapon(jj.opp_weapon)
    if (jj.opp_weakness)         s.setOppWeakness(jj.opp_weakness)
  }, [step])

  // Pre-fill opponent context from previous matches
  useEffect(() => {
    if (!oppName) return
    const prev = [...matches].filter(m => m.opponent?.name === oppName && m.journal?.opp_style).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (prev) {
      const jj = prev.journal
      const s = j.setters
      if (!j.fields.oppStyle && jj.opp_style) s.setOppStyle(jj.opp_style)
      if (!j.fields.oppLefty && jj.opp_lefty != null) s.setOppLefty(jj.opp_lefty ? 'yes' : 'no')
      if (!j.fields.netGame && jj.net_game) s.setNetGame(jj.net_game)
      if (!j.fields.mentalGame && jj.mental_game) s.setMentalGame(jj.mental_game)
      if (!j.fields.oppWeapon && jj.opp_weapon) s.setOppWeapon(jj.opp_weapon)
      if (!j.fields.oppWeakness && jj.opp_weakness) s.setOppWeakness(jj.opp_weakness)
    }
  }, [oppName])

  const knownOpponents = (() => {
    const map = new Map<string, { name: string; utr: number | null }>()
    ;[...matches].sort((a, b) => a.date < b.date ? -1 : 1).forEach(m => {
      const name = m.opponent?.name?.trim()
      if (!name || name === 'Unknown') return
      map.set(name, { name, utr: m.opponent?.utr ?? null })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })()

  const handleContinue = () => {
    if (!oppName.trim()) { setStatus('Enter opponent name'); return }
    const id = makeMatchId(matchDate, oppName)
    const found = matches.find(m => m.id === id)
    setExistingMatch(found || null)
    setPendingMatch(found || null)
    setStatus('')
    setStep('branch')
  }

  const resetAll = () => {
    setStep('entry'); setOppName(''); setOppUtr(''); setSurface('Clay')
    setMatchDate(new Date().toISOString().split('T')[0]); setExistingMatch(null)
    setPendingMatch(null); setXlsxFile(null); setXlsxPreview(null)
    setJdImg(null); setOppImg(null); setMatchImg(null)
    setShowOverwriteWarning(false); setOverwriteConfirmed(false)
    setResult(''); setScoreStr('')
    j.reset()
    ;[fileRef, jdRef, oppRef, matchRef].forEach(r => { if (r.current) r.current.value = '' })
  }

  const doSave = async (match: any) => {
    setStatus('Saving...')
    const journalData = j.toData()
    const hasJournal = Object.values(journalData).some(v => v != null)
    const cleanMatch = {
      ...match,
      opponent: { ...match.opponent, name: (match.opponent?.name || oppName).trim() },
      ...(hasJournal ? { journal: journalData } : {}),
    }
    const res = await fetch('/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match: cleanMatch }) })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || 'Save failed')
    onMatchAdded(cleanMatch)
    setStatus('Saved!')
    setTimeout(resetAll, 1500)
  }

  const doJournalSave = async () => {
    setLoading(true)
    try {
      const id = makeMatchId(matchDate, oppName)
      const base = existingMatch || {
        id, date: matchDate,
        opponent: { name: oppName.trim(), utr: oppUtr ? Number(oppUtr) : null },
        surface,
        score: { sets: scoreStr || '', sets_arr: null, winner: result === 'win' ? 'JD' : result === 'loss' ? 'opponent' : '' },
      }
      await doSave(base)
    } catch (e: any) { setStatus('Error: ' + e.message) }
    setLoading(false)
  }

  const handleImgFile = (setter: (f: File | null) => void) => (e: any) => {
    setter(e.target.files?.[0] ?? null)
    setStatus('')
    setShowOverwriteWarning(false)
  }
  const clearXlsx = () => { setXlsxFile(null); setXlsxPreview(null); if (fileRef.current) fileRef.current.value = '' }

  const processUpload = async (confirmed = false) => {
    const hasScreenshots = jdImg || oppImg || matchImg
    const hasXlsx = !!xlsxFile
    if (!hasScreenshots && !hasXlsx) { setStatus('Add at least one screenshot or .xlsx file'); return }

    // Warn before overwriting existing screenshot stats
    const hasExistingStats = existingMatch && (existingMatch.serve || existingMatch.forehand || existingMatch.shot_stats)
    if (hasExistingStats && hasScreenshots && !confirmed && !overwriteConfirmed) {
      setShowOverwriteWarning(true)
      return
    }

    setLoading(true)
    setShowOverwriteWarning(false)
    const matchId = makeMatchId(matchDate, oppName)
    try {
      // 1. Ensure match record exists for brand-new matches
      if (!existingMatch) {
        const r = await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match: {
            id: matchId, date: matchDate, surface,
            opponent: { name: oppName.trim(), utr: oppUtr ? Number(oppUtr) : null },
            score: { sets: '', sets_arr: null, winner: '' },
          }}),
        })
        if (!r.ok) throw new Error('Failed to create match')
      }

      let finalMatch: any = null

      // 2. Extract + save screenshots (ground truth for all aggregated stats)
      if (hasScreenshots) {
        setStatus('Extracting stats from screenshots…')
        const toB64 = async (f: File) => {
          const ab = await f.arrayBuffer()
          const bytes = new Uint8Array(ab)
          let bin = ''
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
          return { data: btoa(bin), type: f.type || 'image/jpeg' }
        }
        const images = await Promise.all([jdImg, oppImg, matchImg].filter(Boolean).map(f => toB64(f!)))
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images, oppName: oppName.trim(), oppUtr, surface }),
        })
        const extractData = await extractRes.json()
        if (!extractRes.ok || extractData.error) throw new Error(extractData.error || 'Screenshot extraction failed')

        setStatus('Saving screenshot stats…')
        const screenshotMatch = {
          ...extractData.match,
          id: matchId, date: matchDate, surface,
          opponent: { name: oppName.trim(), utr: oppUtr ? Number(oppUtr) : null },
          journal: existingMatch?.journal ?? null,
          has_shot_data: existingMatch?.has_shot_data ?? false,
        }
        const saveRes = await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match: screenshotMatch }),
        })
        if (!saveRes.ok) throw new Error('Failed to save screenshot stats')
        finalMatch = screenshotMatch
      }

      // 3. Process xlsx (adds raw rows + unique analytics only, never overwrites screenshot stats)
      if (hasXlsx) {
        setStatus('Parsing .xlsx…')
        const form = new FormData()
        form.append('file', xlsxFile!)
        form.append('oppName', oppName.trim())
        form.append('oppUtr', oppUtr)
        form.append('surface', surface)
        form.append('matchDate', matchDate)
        const xlsxRes = await fetch(`/api/matches/${matchId}/upload-csv`, { method: 'POST', body: form })
        const xlsxData = await xlsxRes.json()
        if (!xlsxRes.ok || xlsxData.error) throw new Error(xlsxData.error || 'xlsx upload failed')
        setXlsxPreview({ shots: xlsxData.shots, points: xlsxData.points })
        finalMatch = xlsxData.match // always has the freshest full record
      }

      if (finalMatch) onMatchAdded(finalMatch)
      const parts = []
      if (hasScreenshots) parts.push('stats saved')
      if (hasXlsx) parts.push(`${xlsxPreview?.shots ?? '?'} shots imported`)
      setStatus(`Saved — ${parts.join(' · ')}`)
      setTimeout(resetAll, 2000)
    } catch (e: any) { setStatus('Error: ' + e.message) }
    setLoading(false)
  }

  const state = existingMatch ? matchState(existingMatch) : null

  // ── ENTRY SCREEN ────────────────────────────────────────────────────────────
  if (step === 'entry') return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, letterSpacing: '2px', color: WHITE, marginBottom: 4 }}>Add Match</div>
      <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 28 }}>Log a new match or continue where you left off</div>

      {/* Known opponents */}
      {knownOpponents.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 10 }}>Previous Opponents</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {knownOpponents.map(opp => {
              const selected = oppName.trim() === opp.name
              return (
                <button key={opp.name} onClick={() => { setOppName(opp.name); setOppUtr(opp.utr != null ? String(opp.utr) : '') }}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${selected ? GOLD_DIM : BORDER2}`, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: selected ? `${GOLD}1a` : BG2, color: selected ? GOLD : MUTED, fontFamily: FONT_BODY, transition: 'all 0.15s' }}>
                  {opp.name}{opp.utr != null ? ` · ${opp.utr}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 6 }}>Opponent</div>
          <input value={oppName} onChange={e => setOppName(e.target.value)} placeholder="e.g. Gonçalo" style={inp()} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 6 }}>UTR (optional)</div>
          <input value={oppUtr} onChange={e => setOppUtr(e.target.value)} placeholder="e.g. 3.75" style={inp()} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 6 }}>Date</div>
          <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} style={inp()} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, marginBottom: 6 }}>Surface</div>
          <select value={surface} onChange={e => setSurface(e.target.value)} style={{ ...inp(), cursor: 'pointer' }}>
            {['Clay', 'Clay (Indoor)', 'Hard', 'Hard (Indoor)', 'Grass'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {status && <div style={{ marginBottom: 12, fontSize: 13, color: R, fontFamily: FONT_DATA }}>{status}</div>}

      <button onClick={handleContinue} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${GOLD_DIM},${GOLD})`, color: '#0a0a0a', fontSize: 14, fontWeight: 700, letterSpacing: '1px', fontFamily: FONT_BODY, cursor: 'pointer' }}>
        Continue →
      </button>
    </div>
  )

  // ── BRANCH SCREEN ────────────────────────────────────────────────────────────
  if (step === 'branch') {
    const matchId = makeMatchId(matchDate, oppName)
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <button onClick={() => setStep('entry')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: FONT_BODY, marginBottom: 20, padding: 0 }}>← Back</button>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, letterSpacing: '2px', color: WHITE, marginBottom: 4 }}>{oppName}</div>
        <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 28 }}>
          {new Date(matchDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {surface}
        </div>

        {/* Existing match state notice */}
        {existingMatch && (
          <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: MUTED, fontFamily: FONT_BODY }}>
              {state === 'journal-only' && 'Journal logged for this match. Add stats when SwingVision is ready.'}
              {state === 'stats-only' && 'Stats uploaded. Add your journal to unlock the full debrief.'}
              {state === 'complete' && 'This match is fully logged.'}
            </div>
          </div>
        )}

        {/* Branch options */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {(state === null || state === 'stats-only') && (
            <button onClick={() => setStep('journal')}
              style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${BORDER2}`, background: BG2, color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', textAlign: 'left' as const, transition: 'border-color 0.15s' }}>
              <div>Journal</div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginTop: 4, fontFamily: FONT_BODY }}>How did it feel? Fill now, stats can come later.</div>
            </button>
          )}
          {state === 'journal-only' && (
            <button onClick={() => setStep('journal')}
              style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${BORDER2}`, background: BG2, color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', textAlign: 'left' as const }}>
              <div>Edit Journal</div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginTop: 4 }}>Update your notes for this match.</div>
            </button>
          )}
          {state === 'complete' && (
            <button onClick={() => setStep('journal')}
              style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${BORDER2}`, background: BG2, color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', textAlign: 'left' as const }}>
              <div>Edit Journal</div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginTop: 4 }}>Update your notes for this match.</div>
            </button>
          )}
          {(state === null || state === 'journal-only') && (
            <button onClick={() => setStep('upload')}
              style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${BORDER2}`, background: BG2, color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', textAlign: 'left' as const }}>
              <div>Upload Stats</div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginTop: 4 }}>SwingVision .xlsx export → full shot data.</div>
            </button>
          )}
          {(state === 'stats-only' || state === 'complete') && (
            <button onClick={() => setStep('upload')}
              style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${BORDER2}`, background: BG2, color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', textAlign: 'left' as const }}>
              <div>Re-upload Stats</div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginTop: 4 }}>Replace with a new SwingVision .xlsx export.</div>
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── JOURNAL SCREEN ───────────────────────────────────────────────────────────
  if (step === 'journal') return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <button onClick={() => setStep('branch')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: FONT_BODY, marginBottom: 20, padding: 0 }}>← Back</button>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, letterSpacing: '2px', color: WHITE, marginBottom: 4 }}>Journal</div>
      <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 24 }}>{oppName} · {new Date(matchDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · all optional</div>

      <JournalForm j={j} showResult={!existingMatch?.score?.winner} result={result} setResult={setResult} scoreStr={scoreStr} setScoreStr={setScoreStr} />

      {status && <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 8, background: '#111', border: `1px solid ${BORDER}`, fontSize: 13, color: '#aaa', textAlign: 'center' as const, fontFamily: FONT_DATA }}>{status}</div>}

      <button onClick={doJournalSave} disabled={loading}
        style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none', background: loading ? BG3 : `linear-gradient(135deg,${GOLD_DIM},${GOLD})`, color: loading ? MUTED : '#0a0a0a', fontSize: 14, fontWeight: 700, letterSpacing: '1px', fontFamily: FONT_BODY, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Saving...' : 'Save Journal'}
      </button>
    </div>
  )

  // ── UPLOAD SCREEN ────────────────────────────────────────────────────────────
  const hasAnything = jdImg || oppImg || matchImg || xlsxFile

  // Small reusable image slot
  const ImgSlot = ({ label, file, setFile, inputRef }: { label: string; file: File | null; setFile: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement> }) => (
    <div
      onClick={() => inputRef.current?.click()}
      style={{ flex: 1, minWidth: 0, border: `1px dashed ${file ? 'rgba(74,222,128,0.5)' : BORDER2}`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' as const, cursor: 'pointer', background: file ? 'rgba(74,222,128,0.04)' : 'transparent', transition: 'all 0.2s' }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleImgFile(setFile)} style={{ display: 'none' }} />
      {file ? (
        <div>
          <div style={{ fontSize: 11, color: G, fontFamily: FONT_BODY, wordBreak: 'break-all' as const, marginBottom: 4 }}>{file.name.length > 14 ? file.name.slice(0, 12) + '…' : file.name}</div>
          <button onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 10, cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT_BODY, padding: 0 }}>clear</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 18, opacity: 0.25, marginBottom: 4 }}>+</div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.3 }}>{label}</div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <button onClick={() => setStep('branch')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: FONT_BODY, marginBottom: 20, padding: 0 }}>← Back</button>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, letterSpacing: '2px', color: WHITE, marginBottom: 4 }}>Add Data</div>
      <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_DATA, marginBottom: 28 }}>{oppName} · any combination works</div>

      {/* Screenshots section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, fontFamily: FONT_BODY, marginBottom: 4 }}>Screenshots <span style={{ color: DIM, fontWeight: 400, letterSpacing: 0, textTransform: 'none' as const, fontSize: 10 }}>optional</span></div>
        <div style={{ fontSize: 11, color: DIM, fontFamily: FONT_DATA, marginBottom: 12 }}>SwingVision → Shot Stats tab → each player tab + Match Stats tab</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ImgSlot label="JD's Shots"   file={jdImg}    setFile={setJdImg}    inputRef={jdRef} />
          <ImgSlot label="Opp's Shots"  file={oppImg}   setFile={setOppImg}   inputRef={oppRef} />
          <ImgSlot label="Match Stats"  file={matchImg} setFile={setMatchImg} inputRef={matchRef} />
        </div>
      </div>

      {/* xlsx section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: MUTED, fontFamily: FONT_BODY, marginBottom: 4 }}>Stats File <span style={{ color: DIM, fontWeight: 400, letterSpacing: 0, textTransform: 'none' as const, fontSize: 10 }}>optional · adds raw shot data + rally analytics</span></div>
        <div style={{ fontSize: 11, color: DIM, fontFamily: FONT_DATA, marginBottom: 12 }}>SwingVision → Shot Stats tab → <span style={{ color: '#60a5fa' }}>Export Shots to CSV</span> → .xlsx</div>
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: `1px dashed ${xlsxFile ? 'rgba(74,222,128,0.5)' : BORDER2}`, borderRadius: 10, padding: '16px 14px', textAlign: 'center' as const, cursor: 'pointer', background: xlsxFile ? 'rgba(74,222,128,0.04)' : 'transparent', transition: 'all 0.2s' }}>
          <input ref={fileRef} type="file" accept=".xlsx" onChange={e => { setXlsxFile(e.target.files?.[0] ?? null); setXlsxPreview(null); setStatus('') }} style={{ display: 'none' }} />
          {xlsxFile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'left' as const }}>
                <div style={{ fontSize: 13, color: G, fontFamily: FONT_BODY }}>{xlsxFile.name}</div>
                <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_DATA }}>{(xlsxFile.size / 1024).toFixed(0)} KB{xlsxPreview ? ` · ${xlsxPreview.shots} shots · ${xlsxPreview.points} pts` : ''}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); clearXlsx() }} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT_BODY }}>clear</button>
            </div>
          ) : (
            <div style={{ color: MUTED, fontSize: 13, fontFamily: FONT_BODY }}>Tap to select .xlsx file</div>
          )}
        </div>
      </div>

      {/* Overwrite warning */}
      {showOverwriteWarning && (
        <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: A, fontFamily: FONT_BODY, fontWeight: 600, marginBottom: 6 }}>⚠ Replace existing stats?</div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginBottom: 14, lineHeight: 1.5 }}>
            This match already has stats from screenshots. Uploading new screenshots will replace them. Raw shot data (xlsx) won't be affected.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowOverwriteWarning(false)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${BORDER2}`, background: 'transparent', color: MUTED, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => { setOverwriteConfirmed(true); processUpload(true) }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid rgba(251,191,36,0.4)`, background: 'rgba(251,191,36,0.08)', color: A, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer' }}>
              Replace stats
            </button>
          </div>
        </div>
      )}

      <button onClick={() => processUpload(false)} disabled={loading || !hasAnything}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: loading || !hasAnything ? 'not-allowed' : 'pointer', background: loading || !hasAnything ? BG3 : `linear-gradient(135deg,${GOLD_DIM},${GOLD})`, color: loading || !hasAnything ? MUTED : '#0a0a0a', fontSize: 14, fontWeight: 700, letterSpacing: '1px', fontFamily: FONT_BODY, transition: 'all 0.2s' }}>
        {loading ? status || 'Uploading…' : 'Upload & Save'}
      </button>

      {status && !loading && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#111', border: `1px solid ${BORDER}`, fontSize: 13, color: status.startsWith('Error') ? R : G, textAlign: 'center' as const, fontFamily: FONT_DATA }}>
          {status}
        </div>
      )}
    </div>
  )
}
