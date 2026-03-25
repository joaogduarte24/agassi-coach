'use client'
import { useState, useRef, useEffect } from 'react'
import { G, A, GD, deepMerge, getMissingFields } from '@/app/lib/helpers'

interface UploadMatchProps {
  onMatchAdded: (m: any) => void
  matches?: any[]
}

// ─── JOURNAL SUB-COMPONENTS ──────────────────────────────────────────────────

const GOLD = '#e8d5b0'

function Dots({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(value === i ? 0 : i)} style={{
          width: 44, height: 44, borderRadius: '50%', padding: 0, cursor: 'pointer',
          border: `2px solid ${i <= value ? GOLD : '#2a2a2a'}`,
          background: i <= value ? 'rgba(232,213,176,0.1)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: i <= value ? GOLD : '#2a2a2a',
            transition: 'all 0.15s',
          }} />
        </button>
      ))}
    </div>
  )
}

function Chips({ options, value, onChange, multi = false, color = GOLD }: {
  options: string[]; value: string | string[]; onChange: (v: any) => void
  multi?: boolean; color?: string
}) {
  const isActive = (opt: string) => multi
    ? (value as string[]).includes(opt)
    : value === opt

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
            padding: '9px 16px', borderRadius: 20, fontSize: 13,
            border: `1px solid ${active ? color : '#2a2a2a'}`,
            background: active ? `${color}1a` : '#161616',
            color: active ? color : '#555', cursor: 'pointer',
            fontFamily: 'inherit', minHeight: 40, transition: 'all 0.15s',
          }}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function Q({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: '#ccc' }}>{label}</span>
        {note && <span style={{ fontSize: 11, color: '#444', marginLeft: 8, fontFamily: 'monospace' }}>{note}</span>}
      </div>
      {children}
    </div>
  )
}

function JSection({ title, open, onToggle, answered, children }: {
  title: string; open: boolean; onToggle: () => void; answered: number; children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'none', border: 'none', padding: '14px 0', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 11, letterSpacing: 2, color: open ? '#888' : '#444', fontFamily: 'monospace', textTransform: 'uppercase' as const }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {answered > 0 && !open && (
            <span style={{ fontSize: 10, color: G, fontFamily: 'monospace', background: 'rgba(74,222,128,0.1)', padding: '2px 7px', borderRadius: 10 }}>{answered} answered</span>
          )}
          <span style={{ color: '#333', fontSize: 12, fontFamily: 'monospace' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
      <div style={{ height: 1, background: '#1a1a1a' }} />
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function UploadMatch({ onMatchAdded, matches = [] }: UploadMatchProps) {
  // Upload state
  const [images, setImages] = useState<any[]>([])
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')
  const [surface, setSurface] = useState('Clay')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [pendingMatch, setPendingMatch] = useState<any>(null)
  const [missingAlert, setMissingAlert] = useState<{ path: string[]; label: string; section: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Journal state
  const [journalOpen, setJournalOpen] = useState(true)
  const [beforeOpen, setBeforeOpen] = useState(false)
  const [afterOpen, setAfterOpen] = useState(true)
  const [contextOpen, setContextOpen] = useState(false)

  // Before
  const [recovery, setRecovery] = useState('')
  const [physicalFeel, setPhysicalFeel] = useState(0)
  const [matchType, setMatchType] = useState('')
  const [warmup, setWarmup] = useState('')

  // After
  const [planExecuted, setPlanExecuted] = useState('')
  const [focus, setFocus] = useState(0)
  const [composure, setComposure] = useState(0)
  const [decidedBy, setDecidedBy] = useState<string[]>([])
  const [priorityNext, setPriorityNext] = useState('')

  // Context
  const [oppStyle, setOppStyle] = useState('')
  const [oppLefty, setOppLefty] = useState('')
  const [conditions, setConditions] = useState<string[]>([])

  // Pre-fill opponent context from previous matches when a known opponent is selected
  useEffect(() => {
    if (!oppName) return
    const prevWithJournal = [...matches]
      .filter(m => m.opponent?.name === oppName && m.journal?.opp_style)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (prevWithJournal) {
      if (!oppStyle) setOppStyle(prevWithJournal.journal.opp_style)
      if (!oppLefty && prevWithJournal.journal.opp_lefty != null)
        setOppLefty(prevWithJournal.journal.opp_lefty ? 'yes' : 'no')
    }
  }, [oppName])

  const journalData = {
    recovery: recovery || null,
    physical_feel: physicalFeel || null,
    match_type: matchType || null,
    warmup: warmup || null,
    plan_executed: planExecuted || null,
    focus: focus || null,
    composure: composure || null,
    decided_by: decidedBy.length ? decidedBy : null,
    priority_next: priorityNext || null,
    opp_style: oppStyle || null,
    opp_lefty: oppLefty === 'yes' ? true : oppLefty === 'no' ? false : null,
    conditions: conditions.length ? conditions : null,
  }

  const beforeAnswered = [recovery, physicalFeel, matchType, warmup].filter(Boolean).length
  const afterAnswered = [planExecuted, focus, composure, decidedBy.length > 0 ? 1 : 0, priorityNext].filter(Boolean).length
  const contextAnswered = [oppStyle, oppLefty, conditions.length > 0 ? 1 : 0].filter(Boolean).length

  const knownOpponents: { name: string; utr: number | null }[] = (() => {
    const map = new Map<string, { name: string; utr: number | null; date: string }>()
    ;[...matches].sort((a, b) => a.date < b.date ? -1 : 1).forEach(m => {
      const name = m.opponent?.name?.trim()
      if (!name || name === 'Unknown') return
      map.set(name, { name, utr: m.opponent?.utr ?? null, date: m.date })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })()

  const handleFiles = (e: any) => {
    const files = Array.from(e.target.files) as File[]
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => {
        const result = ev.target?.result as string
        setImages(prev => [...prev, { name: f.name, data: result.split(',')[1], type: f.type }])
      }
      reader.readAsDataURL(f)
    })
  }

  const clearImages = () => { setImages([]); if (fileRef.current) fileRef.current.value = '' }

  const doSave = async (match: any) => {
    setStatus('Saving match...')
    const hasJournal = Object.values(journalData).some(v => v != null)
    const cleanMatch = {
      ...(match.opponent?.name
        ? { ...match, opponent: { ...match.opponent, name: match.opponent.name.trim() } }
        : match),
      ...(hasJournal ? { journal: journalData } : {}),
    }
    const saveRes = await fetch('/api/matches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match: cleanMatch })
    })
    const saveData = await saveRes.json()
    if (!saveRes.ok || saveData.error) throw new Error(saveData.error || 'Save failed')
    onMatchAdded(cleanMatch)
    clearImages(); setOppName(''); setOppUtr(''); setPendingMatch(null); setMissingAlert([])
    setStatus('Match saved!'); setTimeout(() => setStatus(''), 3000)
  }

  const processMatch = async () => {
    if (!images.length) { setStatus('Upload at least one screenshot'); return }
    setLoading(true)
    setStatus(pendingMatch ? 'Merging screenshots...' : 'Analysing screenshots...')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, oppName: oppName.trim(), oppUtr, surface })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed')
      const merged = pendingMatch ? deepMerge(pendingMatch, data.match) : data.match
      if (pendingMatch?.id) merged.id = pendingMatch.id
      const missing = getMissingFields(merged)
      if (missing.length > 0) {
        setPendingMatch(merged); setMissingAlert(missing); clearImages(); setStatus('')
      } else {
        await doSave(merged)
      }
    } catch (e: any) { setStatus('Error: ' + e.message) }
    setLoading(false)
  }

  const inp = (style: any) => ({ ...style, background: '#161616', border: '1px solid #252525', borderRadius: 8, padding: '9px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' })
  const hasPending = pendingMatch && missingAlert.length > 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, color: '#e8d5b0', marginBottom: 6 }}>Upload New Match</div>
      <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginBottom: 24 }}>SwingVision "My Shots" tab — scroll to capture Serve, Return, Forehand <strong style={{ color: '#666' }}>and Backhand</strong></div>

      {/* MISSING STATS ALERT */}
      {hasPending && (
        <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: A }}>Missing Stats Detected</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', marginLeft: 'auto', background: 'rgba(251,191,36,0.1)', padding: '2px 7px', borderRadius: 4 }}>{missingAlert.length} field{missingAlert.length > 1 ? 's' : ''}</span>
          </div>
          {(['Serve', 'Return', 'Groundstrokes', 'Shot Stats', 'Match Stats'] as const).map(section => {
            const fields = missingAlert.filter(f => f.section === section)
            if (!fields.length) return null
            return (
              <div key={section} style={{ marginBottom: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#444', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>{section}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: 5 }}>
                  {fields.map(f => (
                    <span key={f.label} style={{ fontSize: 10, color: A, fontFamily: 'monospace', background: 'rgba(251,191,36,0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(251,191,36,0.15)' }}>
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', lineHeight: 1.55, padding: '8px 10px', background: '#111', borderRadius: 6, marginBottom: 12 }}>
            In SwingVision: open this match → <strong style={{ color: '#666' }}>My Shots</strong> tab → scroll down past Forehand to the <strong style={{ color: '#666' }}>Backhand</strong> section → screenshot → add below.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMissingAlert([])}
              style={{ flex: 2, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', color: A, fontSize: 11, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1.5, cursor: 'pointer' }}>
              ADD MORE SCREENSHOTS
            </button>
            <button onClick={async () => { setLoading(true); try { await doSave(pendingMatch) } catch (e: any) { setStatus('Error: ' + e.message) } setLoading(false) }}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #252525', background: 'transparent', color: '#444', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer' }}>
              Save anyway
            </button>
          </div>
        </div>
      )}

      {/* MAIN UPLOAD FORM */}
      {!hasPending && (
        <>
          {/* Drop zone */}
          <div onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${images.length ? 'rgba(74,222,128,0.4)' : '#252525'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: images.length ? 'rgba(74,222,128,0.03)' : 'transparent', transition: 'all 0.2s' }}>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{ display: 'none' }} />
            {images.length ? (
              <div>
                <div style={{ fontSize: 26, marginBottom: 8 }}>📸</div>
                <div style={{ color: G, fontSize: 13 }}>{images.length} image{images.length > 1 ? 's' : ''} ready</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{images.map(i => i.name).join(', ')}</div>
                <button onClick={e => { e.stopPropagation(); clearImages() }} style={{ marginTop: 8, background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>clear</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>↑</div>
                <div style={{ color: '#555', fontSize: 13 }}>Tap to select screenshots</div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>JPEG or PNG · My Shots tab · scroll to capture all sections</div>
              </div>
            )}
          </div>

          {/* Previous opponents */}
          {knownOpponents.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 7 }}>PREVIOUS OPPONENT</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: 6 }}>
                {knownOpponents.map(opp => {
                  const selected = oppName.trim() === opp.name
                  return (
                    <button key={opp.name} onClick={() => { setOppName(opp.name); setOppUtr(opp.utr != null ? String(opp.utr) : '') }}
                      style={{ padding: '5px 11px', borderRadius: 20, border: '1px solid', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', borderColor: selected ? '#c4a96a' : '#252525', background: selected ? 'rgba(196,169,106,0.14)' : 'transparent', color: selected ? '#e8d5b0' : '#666', fontFamily: 'monospace' }}>
                      {opp.name}{opp.utr != null ? ` · ${opp.utr}` : ''}
                    </button>
                  )
                })}
                {oppName && <button onClick={() => { setOppName(''); setOppUtr('') }}
                  style={{ padding: '5px 11px', borderRadius: 20, border: '1px solid #252525', fontSize: 11, cursor: 'pointer', background: 'transparent', color: '#333', fontFamily: 'monospace' }}>
                  clear
                </button>}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 5 }}>OPPONENT{knownOpponents.length > 0 ? ' (or type new)' : ''}</div>
              <input value={oppName} onChange={e => setOppName(e.target.value)} placeholder="e.g. Gonçalo" style={inp({})} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 5 }}>UTR (OPTIONAL)</div>
              <input value={oppUtr} onChange={e => setOppUtr(e.target.value)} placeholder="e.g. 3.75" style={inp({})} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>SURFACE</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any }}>
              {['Clay', 'Clay (Indoor)', 'Hard', 'Hard (Indoor)', 'Grass'].map(s => (
                <button key={s} onClick={() => setSurface(s)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', borderColor: surface === s ? '#c4a96a' : '#252525', background: surface === s ? 'rgba(196,169,106,0.12)' : 'transparent', color: surface === s ? '#e8d5b0' : '#555', fontFamily: 'monospace' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ─── MATCH JOURNAL ─────────────────────────────────────── */}
          <div style={{ background: '#111', borderRadius: 14, padding: '4px 16px 8px', marginBottom: 20, border: '1px solid #1a1a1a' }}>
            {/* Journal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 10px' }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: 2, color: '#666', fontFamily: 'monospace', textTransform: 'uppercase' as const }}>Match Journal</span>
                <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', marginLeft: 10 }}>all optional</span>
              </div>
              <button onClick={() => setJournalOpen(v => !v)} style={{ background: 'none', border: 'none', color: '#333', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', padding: '4px 0' }}>
                {journalOpen ? 'hide ▲' : 'add notes ▼'}
              </button>
            </div>

            {journalOpen && (
              <>
                {/* BEFORE THE MATCH */}
                <JSection title="Before the Match" open={beforeOpen} onToggle={() => setBeforeOpen(v => !v)} answered={beforeAnswered}>
                  <Q label="Recovery score">
                    <Chips options={['Low', 'Moderate', 'Good', 'Peak']} value={recovery} onChange={setRecovery}
                      color={recovery === 'Low' ? '#f87171' : recovery === 'Moderate' ? '#fbbf24' : '#4ade80'} />
                  </Q>
                  <Q label="How does your body feel?" note="1 = dead  5 = fresh">
                    <Dots value={physicalFeel} onChange={setPhysicalFeel} />
                  </Q>
                  <Q label="Match type">
                    <Chips options={['Practice', 'League', 'Tournament', 'Friendly']} value={matchType} onChange={setMatchType} />
                  </Q>
                  <Q label="Warmup">
                    <Chips options={['Full', 'Light', 'None']} value={warmup} onChange={setWarmup} />
                  </Q>
                </JSection>

                {/* AFTER THE MATCH */}
                <JSection title="After the Match" open={afterOpen} onToggle={() => setAfterOpen(v => !v)} answered={afterAnswered}>
                  <Q label="Did you execute your game plan?">
                    <Chips options={['Yes', 'Mostly', 'No']} value={planExecuted} onChange={setPlanExecuted}
                      color={planExecuted === 'Yes' ? '#4ade80' : planExecuted === 'No' ? '#f87171' : '#fbbf24'} />
                  </Q>
                  <Q label="Focus during the match" note="1 = scattered  5 = locked in">
                    <Dots value={focus} onChange={setFocus} />
                  </Q>
                  <Q label="Composure on big points" note="1 = shaky  5 = ice">
                    <Dots value={composure} onChange={setComposure} />
                  </Q>
                  <Q label="What decided the match?" note="pick any">
                    <Chips options={['My serve', 'My return', 'My errors', 'Their level', 'Pressure moments', 'Fitness', 'Luck']}
                      value={decidedBy} onChange={setDecidedBy} multi />
                  </Q>
                  <Q label="Top priority for next match with this opponent">
                    <Chips options={['Serve %', 'Reduce UE', 'Return depth', 'BP conversion', 'Footwork', 'Composure', 'Aggression']}
                      value={priorityNext} onChange={setPriorityNext} color='#60a5fa' />
                  </Q>
                </JSection>

                {/* CONTEXT */}
                <JSection title="Context" open={contextOpen} onToggle={() => setContextOpen(v => !v)} answered={contextAnswered}>
                  <Q label="Opponent style">
                    <Chips options={['Baseliner', 'Serve & Volleyer', 'All-Court', 'Pusher', 'Big Server', 'Moonballer']}
                      value={oppStyle} onChange={setOppStyle} color='#c084fc' />
                  </Q>
                  <Q label="Handedness">
                    <Chips options={['Right-handed', 'Lefty']} value={oppLefty === 'yes' ? 'Lefty' : oppLefty === 'no' ? 'Right-handed' : ''}
                      onChange={v => setOppLefty(v === 'Lefty' ? 'yes' : v === 'Right-handed' ? 'no' : '')} />
                  </Q>
                  <Q label="Conditions" note="pick any">
                    <Chips options={['Hot', 'Windy', 'Cold', 'Normal']} value={conditions} onChange={setConditions} multi />
                  </Q>
                </JSection>
              </>
            )}
          </div>

          <button onClick={processMatch} disabled={loading || !images.length}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', cursor: loading || !images.length ? 'not-allowed' : 'pointer', background: loading || !images.length ? '#161616' : 'linear-gradient(135deg,#c4a96a,#e8d5b0)', color: loading || !images.length ? '#333' : '#0a0a0a', fontSize: 14, fontWeight: 700, letterSpacing: 2, fontFamily: "'Bebas Neue',sans-serif", transition: 'all 0.2s' }}>
            {loading ? 'PROCESSING...' : 'EXTRACT & SAVE MATCH'}
          </button>
        </>
      )}

      {/* ADD MORE ZONE */}
      {hasPending === false && pendingMatch && (
        <>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed rgba(251,191,36,0.3)', borderRadius: 12, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: 'rgba(251,191,36,0.02)' }}>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{ display: 'none' }} />
            {images.length ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📸</div>
                <div style={{ color: A, fontSize: 13 }}>{images.length} screenshot{images.length > 1 ? 's' : ''} — will merge with previous extraction</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{images.map(i => i.name).join(', ')}</div>
                <button onClick={e => { e.stopPropagation(); clearImages() }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>clear</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 6, color: A, opacity: 0.5 }}>↑</div>
                <div style={{ color: A, fontSize: 12 }}>Add screenshots for missing sections</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>Scroll to Backhand in SwingVision → screenshot → add here</div>
              </div>
            )}
          </div>
          <button onClick={processMatch} disabled={loading || !images.length}
            style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', cursor: loading || !images.length ? 'not-allowed' : 'pointer', background: loading || !images.length ? '#161616' : 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: loading || !images.length ? '#333' : '#0a0a0a', fontSize: 14, fontWeight: 700, letterSpacing: 2, fontFamily: "'Bebas Neue',sans-serif" }}>
            {loading ? 'PROCESSING...' : 'EXTRACT & MERGE'}
          </button>
        </>
      )}

      {status && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#111', border: '1px solid #1e1e1e', fontSize: 13, color: '#aaa', textAlign: 'center' }}>
          {status}
        </div>
      )}
    </div>
  )
}
