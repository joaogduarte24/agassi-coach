'use client'
import { useState, useEffect, useRef, useCallback, Component } from 'react'
import { ATP_PLAYERS, ATPPlayer } from '@/lib/atp-players'

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{children: React.ReactNode}, {err: string|null}> {
  constructor(props: any) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(e: any) { return { err: e?.message || String(e) } }
  componentDidCatch(e: any) { console.error('MatchDetail crash:', e?.stack || e) }
  render() {
    if (this.state.err) return (
      <div style={{background:'#1a0a0a',border:'1px solid #f87171',borderRadius:10,padding:16,margin:'12px 0',fontFamily:'monospace',fontSize:11,color:'#f87171',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
        <div style={{fontWeight:700,marginBottom:6}}>⚠ Render error — copy this and send to debug:</div>
        {this.state.err}
      </div>
    )
    return this.props.children
  }
}

const G = '#4ade80', A = '#fbbf24', R = '#f87171', B = '#60a5fa'
const GD = 'rgba(74,222,128,0.12)', AD = 'rgba(251,191,36,0.12)', RD = 'rgba(248,113,113,0.12)'

function avg(arr: (number|null|undefined)[]) {
  const v = arr.filter((x): x is number => x != null && !isNaN(x as number))
  return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : null
}
function col(v: number|null, g: number, a: number) {
  if (v == null) return '#555'
  return v >= g ? G : v >= a ? A : R
}
function fmtDate(d: string) {
  return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
}

// ─── STAT BAR ─────────────────────────────────────────────────────────────────
function StatBar({ label, val, avgVal, gThresh, aThresh, suffix='%', maxVal }: any) {
  if (val == null) return null
  const scale = suffix === 'km/h' ? (maxVal || 130) : 100
  const fillPct = Math.min((val/scale)*100, 100)
  const avgPct = avgVal != null ? Math.min((avgVal/scale)*100, 100) : null
  const color = col(val, gThresh, aThresh)
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4}}>
        <span style={{fontSize:11,color:'#888'}}>{label}</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:500,color}}>{val}{suffix}</span>
      </div>
      <div style={{height:6,background:'#252525',borderRadius:3,position:'relative',overflow:'visible'}}>
        <div style={{height:'100%',width:`${fillPct}%`,background:color,borderRadius:3}}/>
        {avgPct != null && (
          <div style={{position:'absolute',top:-4,left:`${avgPct}%`,width:1.5,height:14,background:'rgba(255,255,255,0.55)',borderRadius:1,zIndex:2}}>
            <span style={{position:'absolute',top:-15,left:'50%',transform:'translateX(-50%)',fontSize:8,color:'#444',whiteSpace:'nowrap',fontFamily:'monospace'}}>
              avg {avgVal}{suffix}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MATCH DETAIL ─────────────────────────────────────────────────────────────
function MatchDetail({ m, avgs }: any) {
  const isWin = m.score?.winner === 'JD'
  const s = m.shot_stats || {}
  const utrStr = m.opponent?.utr ? ` · UTR ${m.opponent.utr}` : ''

  const Card = ({ title, children }: any) => (
    <div style={{background:'#1e1e1e',borderRadius:10,padding:14,marginBottom:12}}>
      <div style={{fontSize:10,letterSpacing:2,color:'#555',textTransform:'uppercase',fontFamily:'monospace',marginBottom:12}}>{title}</div>
      {children}
    </div>
  )
  const DepthRow = ({ cc, dtl }: any) => (
    <div style={{display:'flex',gap:12,fontSize:10,color:'#666',marginTop:6}}>
      <span style={{color:cc==null?'#444':cc>=55?G:cc>=45?A:R}}>● Deep CC: {cc??'—'}%</span>
      <span style={{color:dtl==null?'#444':dtl>=55?G:dtl>=45?A:R}}>● DTL: {dtl??'—'}%</span>
    </div>
  )

  return (
    <div>
      <div style={{background:'#161616',border:'1px solid #2a2a2a',borderRadius:14,padding:20,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,lineHeight:1.1}}>
              JD vs {m.opponent?.name}{utrStr}
            </div>
            <div style={{fontSize:11,color:'#666',marginTop:4,fontFamily:'monospace'}}>
              {fmtDate(m.date)} · {m.surface} · {m.score?.sets}
            </div>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2,padding:'5px 12px',borderRadius:6,background:isWin?GD:RD,color:isWin?G:R,border:`1px solid ${isWin?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}`}}>
            {isWin?'WIN':'LOSS'}
          </span>
        </div>
        <div style={{display:'flex',gap:8}}>
          {(Array.isArray(m.score?.sets_arr) ? m.score.sets_arr : Object.values(m.score?.sets_arr || {})).map(([j,o]: any, i: number) => (
            <span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,padding:'3px 12px',borderRadius:6,background:j>o?GD:RD,color:j>o?G:R}}>{j}–{o}</span>
          ))}
        </div>
      </div>

      {/* Row 1 — key match stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:8}}>
        {[
          {v:s.total_pts_won_pct, l:'Pts Won', pct:true, g:55, a:48},
          {v:s.s1_pts_won_pct,    l:'1st Srv Pts', pct:true, g:70, a:55},
          {v:s.s2_pts_won_pct,    l:'2nd Srv Pts', pct:true, g:55, a:45},
          {v:s.return_pts_won_pct,l:'Ret Pts Won', pct:true, g:55, a:45},
        ].map(({v,l,pct,g,a}:any,i:number)=>(
          <div key={i} style={{background:'#1e1e1e',borderRadius:8,padding:'10px 6px',textAlign:'center'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,
              color:v==null?'#333':v>=g?G:v>=a?A:R}}>
              {v??'—'}{v!=null&&pct?'%':''}
            </div>
            <div style={{fontSize:9,color:'#444',textTransform:'uppercase',letterSpacing:1.2,marginTop:3,fontFamily:'monospace'}}>{l}</div>
          </div>
        ))}
      </div>
      {/* Row 2 — shot counts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:14}}>
        {[
          {v:s.aces,l:'Aces'},
          {v:s.service_winners??s.winners,l:s.service_winners!=null?'Srv W':'Winners'},
          {v:s.ue,l:'UE',inv:true},{v:s.df,l:'DFs',inv:true,lo:true},
          {v:s.bp_saved_pct,l:'BP Saved',pct:true},
        ].map(({v,l,inv,lo,pct}:any,i:number)=>(
          <div key={i} style={{background:'#1e1e1e',borderRadius:8,padding:'10px 6px',textAlign:'center'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,
              color:v==null?'#333':inv?(lo?(v<=3?G:v<=6?A:R):(v<30?G:v<42?A:R)):pct?col(v,70,50):'#f0ede8'}}>
              {v??'—'}{v!=null&&pct?'%':''}
            </div>
            <div style={{fontSize:9,color:'#444',textTransform:'uppercase',letterSpacing:1.2,marginTop:3,fontFamily:'monospace'}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'#444',padding:'7px 12px',background:'#141414',borderRadius:6,marginBottom:14}}>
        <div style={{width:16,height:1.5,background:'rgba(255,255,255,0.45)'}}/>
        <span>White line = your average across all matches</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <Card title="1st Serve">
          <StatBar label="Ad %" val={m.serve?.first?.pct_ad} avgVal={avgs.s1_ad} gThresh={75} aThresh={60} />
          <StatBar label="Ad Speed" val={m.serve?.first?.spd_ad} avgVal={avgs.spd_s1_ad} gThresh={88} aThresh={78} suffix="km/h" />
          <StatBar label="Deuce %" val={m.serve?.first?.pct_deuce} avgVal={avgs.s1_deuce} gThresh={75} aThresh={60} />
          <StatBar label="Deuce Speed" val={m.serve?.first?.spd_deuce} avgVal={avgs.spd_s1_deuce} gThresh={88} aThresh={78} suffix="km/h" />
        </Card>
        <Card title="2nd Serve">
          <StatBar label="Ad %" val={m.serve?.second?.pct_ad} avgVal={avgs.s2_ad} gThresh={80} aThresh={65} />
          <StatBar label="Ad Speed" val={m.serve?.second?.spd_ad} avgVal={avgs.spd_s2_ad} gThresh={75} aThresh={65} suffix="km/h" />
          <StatBar label="Deuce %" val={m.serve?.second?.pct_deuce} avgVal={avgs.s2_deuce} gThresh={80} aThresh={65} />
          <StatBar label="Deuce Speed" val={m.serve?.second?.spd_deuce} avgVal={avgs.spd_s2_deuce} gThresh={75} aThresh={65} suffix="km/h" />
        </Card>
        <Card title="1st Return">
          <StatBar label="Ad %" val={m.return?.first?.pct_ad} avgVal={avgs.ret1_ad} gThresh={80} aThresh={65} />
          <StatBar label="Ad Speed" val={m.return?.first?.spd_ad??m.return?.first?.spd} avgVal={avgs.spd_ret1} gThresh={72} aThresh={62} suffix="km/h" />
          <StatBar label="Deuce %" val={m.return?.first?.pct_deuce} avgVal={avgs.ret1_deuce} gThresh={80} aThresh={65} />
          <StatBar label="Deuce Speed" val={m.return?.first?.spd_deuce} avgVal={avgs.spd_ret1} gThresh={72} aThresh={62} suffix="km/h" />
          <DepthRow cc={m.return?.first?.deep_ad} dtl={m.return?.first?.deep_deuce} />
        </Card>
        <Card title="2nd Return">
          <StatBar label="Ad %" val={m.return?.second?.pct_ad} avgVal={avgs.ret2_ad} gThresh={80} aThresh={65} />
          <StatBar label="Ad Speed" val={m.return?.second?.spd_ad??m.return?.second?.spd} avgVal={avgs.spd_ret2} gThresh={72} aThresh={62} suffix="km/h" />
          <StatBar label="Deuce %" val={m.return?.second?.pct_deuce} avgVal={avgs.ret2_deuce} gThresh={80} aThresh={65} />
          <StatBar label="Deuce Speed" val={m.return?.second?.spd_deuce} avgVal={avgs.spd_ret2} gThresh={72} aThresh={62} suffix="km/h" />
          <DepthRow cc={m.return?.second?.deep_ad} dtl={m.return?.second?.deep_deuce} />
        </Card>
        <Card title="Forehand">
          <StatBar label="CC In %" val={m.forehand?.cc_in} avgVal={avgs.fh_cc} gThresh={80} aThresh={65} />
          <StatBar label="CC Speed" val={m.forehand?.spd_cc} avgVal={avgs.spd_fh_cc} gThresh={74} aThresh={65} suffix="km/h" />
          <StatBar label="DTL In %" val={m.forehand?.dtl_in} avgVal={avgs.fh_dtl} gThresh={80} aThresh={65} />
          <StatBar label="DTL Speed" val={m.forehand?.spd_dtl} avgVal={avgs.spd_fh_dtl} gThresh={74} aThresh={65} suffix="km/h" />
          <DepthRow cc={m.forehand?.depth_cc} dtl={m.forehand?.depth_dtl} />
        </Card>
        <Card title="Backhand">
          <StatBar label="CC In %" val={m.backhand?.cc_in} avgVal={avgs.bh_cc} gThresh={80} aThresh={65} />
          <StatBar label="CC Speed" val={m.backhand?.spd_cc} avgVal={avgs.spd_bh_cc} gThresh={68} aThresh={60} suffix="km/h" />
          <StatBar label="DTL In %" val={m.backhand?.dtl_in} avgVal={avgs.bh_dtl} gThresh={80} aThresh={65} />
          <StatBar label="DTL Speed" val={m.backhand?.spd_dtl} avgVal={avgs.spd_bh_dtl} gThresh={68} aThresh={60} suffix="km/h" />
          <DepthRow cc={m.backhand?.depth_cc} dtl={m.backhand?.depth_dtl} />
        </Card>
      </div>

      {/* Opponent Scout */}
      {m.opp_shots && (
        <div style={{background:'#1a1a1a',border:'1px solid #222',borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{fontSize:10,letterSpacing:2,color:'#555',textTransform:'uppercase',fontFamily:'monospace',marginBottom:12}}>
            {m.opponent?.name} — Shot Tendencies
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {/* Opponent serve */}
            <div>
              <div style={{fontSize:9,color:'#333',fontFamily:'monospace',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Their Serve</div>
              {m.opp_shots.serve?.first?.pct_ad != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>1st Ad</span><span style={{fontFamily:'monospace',color:m.opp_shots.serve.first.pct_ad>=65?R:A}}>{m.opp_shots.serve.first.pct_ad}%</span></div>}
              {m.opp_shots.serve?.first?.pct_deuce != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>1st Deuce</span><span style={{fontFamily:'monospace',color:m.opp_shots.serve.first.pct_deuce>=65?R:A}}>{m.opp_shots.serve.first.pct_deuce}%</span></div>}
              {m.opp_shots.serve?.first?.spd_ad != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0'}}><span>Avg Speed</span><span style={{fontFamily:'monospace',color:'#888'}}>{m.opp_shots.serve.first.spd_ad} km/h</span></div>}
            </div>
            {/* Opponent groundstrokes */}
            <div>
              <div style={{fontSize:9,color:'#333',fontFamily:'monospace',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Their Groundstrokes</div>
              {m.opp_shots.forehand?.cc_in != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>FH CC</span><span style={{fontFamily:'monospace',color:m.opp_shots.forehand.cc_in>=75?R:A}}>{m.opp_shots.forehand.cc_in}%</span></div>}
              {m.opp_shots.backhand?.cc_in != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>BH CC</span><span style={{fontFamily:'monospace',color:m.opp_shots.backhand.cc_in>=75?R:A}}>{m.opp_shots.backhand.cc_in}%</span></div>}
              {m.opp_shots.stats?.ue != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0'}}><span>Their UE</span><span style={{fontFamily:'monospace',color:m.opp_shots.stats.ue>35?G:A}}>{m.opp_shots.stats.ue}</span></div>}
            </div>
          </div>
          {/* Opponent key stats if available */}
          {m.opp_shots.stats?.s2_pts_won_pct != null && (
            <div style={{marginTop:10,padding:'6px 10px',background:'#111',borderRadius:6,fontSize:10,color:'#555',fontFamily:'monospace'}}>
              💡 Their 2nd serve pts won: <span style={{color:m.opp_shots.stats.s2_pts_won_pct<45?G:A}}>{m.opp_shots.stats.s2_pts_won_pct}%</span>
              {m.opp_shots.stats?.total_pts_won_pct != null && <> · Total pts won: <span style={{color:'#666'}}>{m.opp_shots.stats.total_pts_won_pct}%</span></>}
            </div>
          )}
        </div>
      )}

      {(m.what_worked||m.what_didnt||m.key_number) && (
        <div style={{background:'#0e0e0e',border:'1px solid #1e1e1e',borderRadius:12,padding:20}}>
          <div style={{fontFamily:'monospace',fontSize:11,letterSpacing:2,color:A,marginBottom:14}}>🎙 COACH'S READ</div>
          {m.what_worked&&<><div style={{fontSize:10,letterSpacing:1.5,color:'#444',textTransform:'uppercase',fontFamily:'monospace',marginBottom:6}}>What Worked</div>
          <ul style={{listStyle:'none',padding:0,marginBottom:10}}>{(Array.isArray(m.what_worked)?m.what_worked:Object.values(m.what_worked)).map((x:any,i:number)=><li key={i} style={{paddingLeft:14,position:'relative',fontSize:13,color:'#bbb',lineHeight:1.6,paddingBottom:3}}><span style={{position:'absolute',left:0,color:'#333'}}>—</span>{x}</li>)}</ul></>}
          {m.what_didnt&&<><div style={{fontSize:10,letterSpacing:1.5,color:'#444',textTransform:'uppercase',fontFamily:'monospace',marginBottom:6,marginTop:10}}>What Didn't</div>
          <ul style={{listStyle:'none',padding:0,marginBottom:10}}>{(Array.isArray(m.what_didnt)?m.what_didnt:Object.values(m.what_didnt)).map((x:any,i:number)=><li key={i} style={{paddingLeft:14,position:'relative',fontSize:13,color:'#bbb',lineHeight:1.6,paddingBottom:3}}><span style={{position:'absolute',left:0,color:'#333'}}>—</span>{x}</li>)}</ul></>}
          {m.key_number&&<div style={{background:'rgba(248,113,113,0.08)',borderLeft:'3px solid #f87171',padding:'10px 14px',borderRadius:'0 8px 8px 0',color:R,fontSize:13,lineHeight:1.6}}>{m.key_number}</div>}
        </div>
      )}
    </div>
  )
}

// ─── STAT COMPLETENESS HELPERS ────────────────────────────────────────────────
const IMPORTANT_FIELDS: { path: string[]; label: string; section: string }[] = [
  { path: ['serve','first','pct_ad'],     label: '1st Serve Ad %',       section: 'Serve' },
  { path: ['serve','first','pct_deuce'],  label: '1st Serve Deuce %',    section: 'Serve' },
  { path: ['serve','second','pct_ad'],    label: '2nd Serve Ad %',        section: 'Serve' },
  { path: ['serve','second','pct_deuce'], label: '2nd Serve Deuce %',     section: 'Serve' },
  { path: ['return','first','pct_ad'],    label: '1st Return Ad %',       section: 'Return' },
  { path: ['return','second','pct_ad'],   label: '2nd Return Ad %',       section: 'Return' },
  { path: ['forehand','cc_in'],           label: 'FH Cross-Court %',      section: 'Groundstrokes' },
  { path: ['forehand','dtl_in'],          label: 'FH Down-the-Line %',    section: 'Groundstrokes' },
  { path: ['backhand','cc_in'],           label: 'BH Cross-Court %',      section: 'Groundstrokes' },
  { path: ['backhand','dtl_in'],          label: 'BH Down-the-Line %',    section: 'Groundstrokes' },
  { path: ['shot_stats','ue'],            label: 'Unforced Errors',       section: 'Shot Stats' },
  { path: ['shot_stats','winners'],       label: 'Winners',               section: 'Shot Stats' },
  { path: ['shot_stats','aces'],              label: 'Aces',                  section: 'Match Stats' },
  { path: ['shot_stats','s1_pts_won_pct'],    label: '1st Srv Pts Won %',     section: 'Match Stats' },
  { path: ['shot_stats','s2_pts_won_pct'],    label: '2nd Srv Pts Won %',     section: 'Match Stats' },
  { path: ['shot_stats','return_pts_won_pct'],label: 'Return Pts Won %',      section: 'Match Stats' },
  { path: ['shot_stats','total_pts_won_pct'], label: 'Total Pts Won %',       section: 'Match Stats' },
]
function getStatVal(obj: any, path: string[]): any { return path.reduce((o, k) => o?.[k], obj) }
function getMissingFields(match: any) { return IMPORTANT_FIELDS.filter(f => getStatVal(match, f.path) == null) }
function deepMerge(existing: any, incoming: any): any {
  // Never recurse into arrays — they hold ordered data (sets, bullet points) and
  // spreading them into objects destroys structure and causes "not iterable" crashes.
  if (Array.isArray(existing)) return existing.length > 0 ? existing : (incoming ?? existing)
  if (typeof existing !== 'object' || existing === null) return existing ?? incoming
  const result = { ...existing }
  for (const k of Object.keys(incoming || {})) {
    if (result[k] == null && incoming[k] != null) result[k] = incoming[k]
    else if (!Array.isArray(result[k]) && typeof result[k] === 'object' && result[k] !== null && typeof incoming[k] === 'object' && incoming[k] !== null)
      result[k] = deepMerge(result[k], incoming[k])
  }
  return result
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────
function UploadMatch({ onMatchAdded, matches = [] }: { onMatchAdded: (m: any) => void; matches?: any[] }) {
  const [images, setImages] = useState<any[]>([])
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')
  const [surface, setSurface] = useState('Clay')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [pendingMatch, setPendingMatch] = useState<any>(null)
  const [missingAlert, setMissingAlert] = useState<{ path: string[]; label: string; section: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Derive unique previous opponents — canonical name + most recent UTR
  const knownOpponents: { name: string; utr: number | null }[] = (() => {
    const map = new Map<string, { name: string; utr: number | null; date: string }>()
    ;[...matches].sort((a,b) => a.date < b.date ? -1 : 1).forEach(m => {
      const name = m.opponent?.name?.trim()
      if (!name || name === 'Unknown') return
      map.set(name, { name, utr: m.opponent?.utr ?? null, date: m.date })
    })
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name))
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
    setStatus('💾 Saving match...')
    // Trim opponent name to prevent whitespace duplicates
    const cleanMatch = match.opponent?.name
      ? { ...match, opponent: { ...match.opponent, name: match.opponent.name.trim() } }
      : match
    const saveRes = await fetch('/api/matches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match: cleanMatch })
    })
    const saveData = await saveRes.json()
    if (!saveRes.ok || saveData.error) throw new Error(saveData.error || 'Save failed')
    onMatchAdded(match)
    clearImages(); setOppName(''); setOppUtr(''); setPendingMatch(null); setMissingAlert([])
    setStatus('✅ Match saved!'); setTimeout(() => setStatus(''), 3000)
  }

  const processMatch = async () => {
    if (!images.length) { setStatus('⚠️ Upload at least one screenshot'); return }
    setLoading(true)
    setStatus(pendingMatch ? '🔄 Merging screenshots...' : '🔍 Analysing screenshots...')
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
    } catch(e: any) { setStatus('❌ ' + e.message) }
    setLoading(false)
  }

  const inp = (style: any) => ({...style, background:'#161616',border:'1px solid #252525',borderRadius:8,padding:'9px 12px',color:'#f0f0f0',fontSize:13,outline:'none',fontFamily:'inherit',width:'100%'})
  const hasPending = pendingMatch && missingAlert.length > 0

  return (
    <div style={{maxWidth:520,margin:'0 auto'}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,color:'#e8d5b0',marginBottom:6}}>Upload New Match</div>
      <div style={{fontSize:12,color:'#555',fontFamily:'monospace',marginBottom:24}}>SwingVision "My Shots" tab — scroll to capture Serve, Return, Forehand <strong style={{color:'#666'}}>and Backhand</strong></div>

      {/* ── MISSING STATS ALERT ── */}
      {hasPending && (
        <div style={{background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>⚠️</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:A}}>Missing Stats Detected</span>
            <span style={{fontFamily:'monospace',fontSize:10,color:'#555',marginLeft:'auto',background:'rgba(251,191,36,0.1)',padding:'2px 7px',borderRadius:4}}>{missingAlert.length} field{missingAlert.length>1?'s':''}</span>
          </div>
          {(['Serve','Return','Groundstrokes','Shot Stats','Match Stats'] as const).map(section => {
            const fields = missingAlert.filter(f => f.section === section)
            if (!fields.length) return null
            return (
              <div key={section} style={{marginBottom:8,background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:9,letterSpacing:1.5,color:'#444',fontFamily:'monospace',textTransform:'uppercase',marginBottom:6}}>{section}</div>
                <div style={{display:'flex',flexWrap:'wrap' as any,gap:5}}>
                  {fields.map(f => (
                    <span key={f.label} style={{fontSize:10,color:A,fontFamily:'monospace',background:'rgba(251,191,36,0.08)',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(251,191,36,0.15)'}}>
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          <div style={{fontSize:11,color:'#444',fontFamily:'monospace',lineHeight:1.55,padding:'8px 10px',background:'#111',borderRadius:6,marginBottom:12}}>
            💡 In SwingVision: open this match → <strong style={{color:'#666'}}>My Shots</strong> tab → scroll down past Forehand to the <strong style={{color:'#666'}}>Backhand</strong> section → screenshot → add below.
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setMissingAlert([])}
              style={{flex:2,padding:'10px 12px',borderRadius:8,border:'1px solid rgba(251,191,36,0.3)',background:'rgba(251,191,36,0.06)',color:A,fontSize:11,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1.5,cursor:'pointer'}}>
              ADD MORE SCREENSHOTS
            </button>
            <button onClick={async () => { setLoading(true); try { await doSave(pendingMatch) } catch(e:any) { setStatus('❌ '+e.message) } setLoading(false) }}
              style={{flex:1,padding:'10px 12px',borderRadius:8,border:'1px solid #252525',background:'transparent',color:'#444',fontSize:10,fontFamily:'monospace',cursor:'pointer'}}>
              Save anyway
            </button>
          </div>
        </div>
      )}

      {/* ── DROP ZONE ── */}
      {!hasPending && (
        <>
          <div onClick={()=>fileRef.current?.click()}
            style={{border:`2px dashed ${images.length?'rgba(74,222,128,0.4)':'#252525'}`,borderRadius:12,padding:'28px 20px',textAlign:'center',cursor:'pointer',marginBottom:16,background:images.length?'rgba(74,222,128,0.03)':'transparent',transition:'all 0.2s'}}>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{display:'none'}} />
            {images.length ? (
              <div>
                <div style={{fontSize:26,marginBottom:8}}>📸</div>
                <div style={{color:G,fontSize:13}}>{images.length} image{images.length>1?'s':''} ready</div>
                <div style={{fontSize:11,color:'#444',marginTop:4}}>{images.map(i=>i.name).join(', ')}</div>
                <button onClick={e=>{e.stopPropagation();clearImages()}} style={{marginTop:8,background:'none',border:'none',color:'#555',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>clear</button>
              </div>
            ) : (
              <div>
                <div style={{fontSize:32,marginBottom:8,opacity:0.3}}>↑</div>
                <div style={{color:'#555',fontSize:13}}>Tap to select screenshots</div>
                <div style={{fontSize:11,color:'#333',marginTop:4}}>JPEG or PNG · My Shots tab · scroll to capture all sections</div>
              </div>
            )}
          </div>

          {/* ── PREVIOUS OPPONENTS ── */}
          {knownOpponents.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:7}}>PREVIOUS OPPONENT</div>
              <div style={{display:'flex',flexWrap:'wrap' as any,gap:6}}>
                {knownOpponents.map(opp => {
                  const selected = oppName.trim() === opp.name
                  return (
                    <button key={opp.name} onClick={() => { setOppName(opp.name); setOppUtr(opp.utr != null ? String(opp.utr) : '') }}
                      style={{padding:'5px 11px',borderRadius:20,border:'1px solid',fontSize:11,cursor:'pointer',transition:'all 0.15s',
                        borderColor: selected ? '#c4a96a' : '#252525',
                        background: selected ? 'rgba(196,169,106,0.14)' : 'transparent',
                        color: selected ? '#e8d5b0' : '#666',
                        fontFamily:'monospace'}}>
                      {opp.name}{opp.utr != null ? ` · ${opp.utr}` : ''}
                    </button>
                  )
                })}
                {oppName && <button onClick={() => { setOppName(''); setOppUtr('') }}
                  style={{padding:'5px 11px',borderRadius:20,border:'1px solid #252525',fontSize:11,cursor:'pointer',background:'transparent',color:'#333',fontFamily:'monospace'}}>
                  ✕ clear
                </button>}
              </div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:5}}>OPPONENT{knownOpponents.length > 0 ? ' (or type new)' : ''}</div>
              <input value={oppName} onChange={e=>setOppName(e.target.value)} placeholder="e.g. Gonçalo" style={inp({})} />
            </div>
            <div>
              <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:5}}>UTR (OPTIONAL)</div>
              <input value={oppUtr} onChange={e=>setOppUtr(e.target.value)} placeholder="e.g. 3.75" style={inp({})} />
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:8}}>SURFACE</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap' as any}}>
              {['Clay','Clay (Indoor)','Hard','Hard (Indoor)','Grass'].map(s=>(
                <button key={s} onClick={()=>setSurface(s)}
                  style={{padding:'6px 12px',borderRadius:6,border:'1px solid',fontSize:11,cursor:'pointer',transition:'all 0.15s',
                    borderColor:surface===s?'#c4a96a':'#252525',
                    background:surface===s?'rgba(196,169,106,0.12)':'transparent',
                    color:surface===s?'#e8d5b0':'#555',fontFamily:'monospace'}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button onClick={processMatch} disabled={loading||!images.length}
            style={{width:'100%',padding:13,borderRadius:10,border:'none',
              cursor:loading||!images.length?'not-allowed':'pointer',
              background:loading||!images.length?'#161616':'linear-gradient(135deg,#c4a96a,#e8d5b0)',
              color:loading||!images.length?'#333':'#0a0a0a',
              fontSize:14,fontWeight:700,letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif",transition:'all 0.2s'}}>
            {loading ? 'PROCESSING...' : 'EXTRACT & SAVE MATCH'}
          </button>
        </>
      )}

      {/* ── ADD MORE ZONE (after alert dismissed) ── */}
      {hasPending === false && pendingMatch && (
        <>
          <div onClick={()=>fileRef.current?.click()}
            style={{border:'2px dashed rgba(251,191,36,0.3)',borderRadius:12,padding:'24px 20px',textAlign:'center',cursor:'pointer',marginBottom:14,background:'rgba(251,191,36,0.02)'}}>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{display:'none'}} />
            {images.length ? (
              <div>
                <div style={{fontSize:24,marginBottom:6}}>📸</div>
                <div style={{color:A,fontSize:13}}>{images.length} screenshot{images.length>1?'s':''} — will merge with previous extraction</div>
                <div style={{fontSize:10,color:'#555',marginTop:3}}>{images.map(i=>i.name).join(', ')}</div>
                <button onClick={e=>{e.stopPropagation();clearImages()}} style={{marginTop:6,background:'none',border:'none',color:'#555',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>clear</button>
              </div>
            ) : (
              <div>
                <div style={{fontSize:28,marginBottom:6,color:A,opacity:0.5}}>↑</div>
                <div style={{color:A,fontSize:12}}>Add screenshots for missing sections</div>
                <div style={{fontSize:10,color:'#444',marginTop:3}}>Scroll to Backhand in SwingVision → screenshot → add here</div>
              </div>
            )}
          </div>
          <button onClick={processMatch} disabled={loading||!images.length}
            style={{width:'100%',padding:13,borderRadius:10,border:'none',
              cursor:loading||!images.length?'not-allowed':'pointer',
              background:loading||!images.length?'#161616':'linear-gradient(135deg,#fbbf24,#f59e0b)',
              color:loading||!images.length?'#333':'#0a0a0a',
              fontSize:14,fontWeight:700,letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif"}}>
            {loading ? 'PROCESSING...' : 'EXTRACT & MERGE'}
          </button>
        </>
      )}

      {status && (
        <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:'#111',border:'1px solid #1e1e1e',fontSize:13,color:'#aaa',textAlign:'center'}}>
          {status}
        </div>
      )}
    </div>
  )
}

// ─── FIX MATCH MODAL ──────────────────────────────────────────────────────────
function FixMatchModal({ match, onPatched, onClose }: { match: any; onPatched: (m: any) => void; onClose: () => void }) {
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const missing = getMissingFields(match)
  const completeness = Math.round((IMPORTANT_FIELDS.length - missing.length) / IMPORTANT_FIELDS.length * 100)
  const compColor = completeness >= 80 ? G : completeness >= 50 ? A : R

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

  const handleFix = async () => {
    if (!images.length) return
    setLoading(true); setStatus('🔍 Extracting from new screenshots...')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, oppName: match.opponent?.name, oppUtr: match.opponent?.utr, surface: match.surface })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      const merged = deepMerge(match, data.match)
      merged.id = match.id
      setStatus('💾 Saving...')
      const saveRes = await fetch('/api/matches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: merged })
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error)
      const stillMissing = getMissingFields(merged)
      setStatus(stillMissing.length === 0 ? '✅ All stats filled!' : `✅ Saved — ${stillMissing.length} field${stillMissing.length>1?'s':''} still missing`)
      onPatched(merged)
      setTimeout(() => onClose(), 1800)
    } catch(e: any) { setStatus('❌ ' + e.message) }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#141414',border:'1px solid #252525',borderRadius:16,padding:24,maxWidth:460,width:'100%',maxHeight:'90vh',overflowY:'auto' as any}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:'#e8d5b0'}}>Fix Match Data</div>
            <div style={{fontSize:11,color:'#555',fontFamily:'monospace',marginTop:2}}>
              JD vs {match.opponent?.name} · {fmtDate(match.date)}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#444',cursor:'pointer',fontSize:22,lineHeight:1,padding:'2px 4px'}}>×</button>
        </div>

        {/* Completeness bar */}
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
            <span style={{fontSize:9,color:'#444',fontFamily:'monospace',letterSpacing:1.5,textTransform:'uppercase'}}>Data Completeness</span>
            <span style={{fontSize:10,fontFamily:'monospace',color:compColor,fontWeight:600}}>{completeness}%</span>
          </div>
          <div style={{height:5,background:'#252525',borderRadius:3}}>
            <div style={{height:'100%',width:`${completeness}%`,background:compColor,borderRadius:3,transition:'width 0.5s'}} />
          </div>
        </div>

        {/* Missing fields */}
        {missing.length > 0 ? (
          <div style={{background:'rgba(0,0,0,0.4)',borderRadius:10,padding:12,marginBottom:16}}>
            <div style={{fontSize:9,letterSpacing:1.5,color:A,fontFamily:'monospace',textTransform:'uppercase',marginBottom:10}}>Missing Fields</div>
            {(['Serve','Return','Groundstrokes','Shot Stats','Match Stats'] as const).map(section => {
              const fields = missing.filter(f => f.section === section)
              if (!fields.length) return null
              return (
                <div key={section} style={{marginBottom:8}}>
                  <div style={{fontSize:9,color:'#333',fontFamily:'monospace',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{section}</div>
                  <div style={{display:'flex',flexWrap:'wrap' as any,gap:4}}>
                    {fields.map(f => (
                      <span key={f.label} style={{fontSize:10,color:A,fontFamily:'monospace',background:'rgba(251,191,36,0.06)',padding:'2px 7px',borderRadius:4,border:'1px solid rgba(251,191,36,0.15)'}}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
            <div style={{marginTop:10,fontSize:10,color:'#444',fontFamily:'monospace',lineHeight:1.55,borderTop:'1px solid #1a1a1a',paddingTop:8}}>
              💡 SwingVision → this match → <strong style={{color:'#666'}}>My Shots</strong> → scroll to the missing section → screenshot → upload below. Existing data is never overwritten.
            </div>
          </div>
        ) : (
          <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:8,padding:12,marginBottom:16,fontSize:12,color:G,fontFamily:'monospace',textAlign:'center'}}>
            ✓ All key stats present — nothing to fix
          </div>
        )}

        {/* Drop zone */}
        <div onClick={()=>fileRef.current?.click()}
          style={{border:`2px dashed ${images.length?'rgba(74,222,128,0.4)':'#252525'}`,borderRadius:10,padding:'20px 16px',textAlign:'center',cursor:'pointer',marginBottom:12,background:images.length?'rgba(74,222,128,0.03)':'transparent',transition:'all 0.2s'}}>
          <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{display:'none'}} />
          {images.length ? (
            <div>
              <div style={{color:G,fontSize:13,marginBottom:3}}>{images.length} screenshot{images.length>1?'s':''} selected</div>
              <div style={{fontSize:10,color:'#444',fontFamily:'monospace'}}>{images.map(i=>i.name).join(', ')}</div>
              <button onClick={e=>{e.stopPropagation();setImages([]);if(fileRef.current)fileRef.current.value=''}} style={{marginTop:6,background:'none',border:'none',color:'#555',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>clear</button>
            </div>
          ) : (
            <div>
              <div style={{fontSize:26,marginBottom:6,opacity:0.3}}>↑</div>
              <div style={{color:'#555',fontSize:12}}>Tap to add screenshots</div>
              <div style={{fontSize:10,color:'#333',marginTop:3}}>Only null fields will be filled — existing data preserved</div>
            </div>
          )}
        </div>

        <button onClick={handleFix} disabled={loading||!images.length}
          style={{width:'100%',padding:12,borderRadius:9,border:'none',
            cursor:loading||!images.length?'not-allowed':'pointer',
            background:loading||!images.length?'#1a1a1a':'linear-gradient(135deg,#fbbf24,#f59e0b)',
            color:loading||!images.length?'#333':'#0a0a0a',
            fontSize:13,fontWeight:700,letterSpacing:1.5,fontFamily:"'Bebas Neue',sans-serif",transition:'all 0.2s'}}>
          {loading ? 'EXTRACTING...' : 'EXTRACT & FILL MISSING STATS'}
        </button>

        {status && (
          <div style={{marginTop:10,padding:'8px 12px',borderRadius:7,background:'#111',fontSize:12,color:'#aaa',textAlign:'center',fontFamily:'monospace'}}>
            {status}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MINI CHART ───────────────────────────────────────────────────────────────
function MiniChart({ data, color, labels }: any) {
  const valid = data.filter((v: any) => v != null)
  if (valid.length < 2) return <div style={{height:55,display:'flex',alignItems:'center',justifyContent:'center',color:'#2a2a2a',fontSize:11,fontFamily:'monospace'}}>Need more data</div>
  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 1
  const H = 55, W = 100
  const pts = data.map((v: any, i: number) => ({
    x: (i/(data.length-1))*W,
    y: v!=null ? H - ((v-min)/range)*(H-10) - 5 : null
  }))
  const pathD = pts.filter((p: any)=>p.y!=null).map((p: any,i: number)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H}} preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2"/>
      {pts.filter((p:any)=>p.y!=null).map((p:any,i:number)=>(
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color}/>
      ))}
    </svg>
  )
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
function RadarChart({ jdValues, atpValues, labels }: { jdValues: number[]; atpValues: number[] | null; labels: string[] }) {
  const size = 220
  const cx = size / 2, cy = size / 2
  const r = 82
  const n = labels.length
  const levels = 4

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2

  const point = (val: number, i: number) => {
    const angle = angleOf(i)
    const d = (val / 100) * r
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) }
  }

  const labelPoint = (i: number) => {
    const angle = angleOf(i)
    const d = r + 18
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) }
  }

  const polyPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + 'Z'

  const gridPts = (frac: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = angleOf(i)
      return { x: cx + r * frac * Math.cos(angle), y: cy + r * frac * Math.sin(angle) }
    })

  const jdPts = jdValues.map((v, i) => point(Math.min(v, 100), i))
  const atpPts = atpValues ? atpValues.map((v, i) => point(Math.min(v, 100), i)) : null

  const W = size + 60 // extra for labels

  return (
    <svg viewBox={`-30 -20 ${W} ${size + 40}`} style={{ width: '100%', maxWidth: 320 }}>
      {/* Grid rings */}
      {Array.from({ length: levels }, (_, li) => {
        const frac = (li + 1) / levels
        const gp = gridPts(frac)
        return (
          <polygon key={li} points={gp.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="#1e1e1e" strokeWidth="1" />
        )
      })}
      {/* Spokes */}
      {Array.from({ length: n }, (_, i) => {
        const angle = angleOf(i)
        return (
          <line key={i} x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="#1a1a1a" strokeWidth="1" />
        )
      })}
      {/* ATP polygon */}
      {atpPts && (
        <path d={polyPath(atpPts)} fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      {/* JD polygon */}
      <path d={polyPath(jdPts)} fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="2" />
      {/* JD dots */}
      {jdPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#4ade80" />
      ))}
      {/* ATP dots */}
      {atpPts && atpPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fbbf24" />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const lp = labelPoint(i)
        const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle'
        return (
          <text key={i} x={lp.x} y={lp.y + 4} textAnchor={anchor}
            fontSize="9" fill="#555" fontFamily="monospace" letterSpacing="0.5">
            {label}
          </text>
        )
      })}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2" fill="#252525" />
    </svg>
  )
}

// ─── COMPARE BAR ──────────────────────────────────────────────────────────────
function CompareBar({ label, jd, atp, gThresh, aThresh, suffix='%', maxVal }: any) {
  if (jd == null) return null
  const scale = suffix === 'km/h' ? (maxVal || 220) : 100
  const jdPct = Math.min((jd / scale) * 100, 100)
  const atpPct = atp != null ? Math.min((atp / scale) * 100, 100) : null
  const color = col(jd, gThresh, aThresh)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color }}>{jd}{suffix}</span>
      </div>
      <div style={{ height: 7, background: '#1e1e1e', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${jdPct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
        {atpPct != null && (
          <div style={{ position: 'absolute', top: -5, left: `${atpPct}%`, width: 2, height: 17, background: '#fff', borderRadius: 1, zIndex: 2, transform: 'translateX(-50%)' }}>
            <span style={{ position: 'absolute', top: 19, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#888', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {atp}{suffix}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── JD STATS TAB ─────────────────────────────────────────────────────────────
function JDStats({ matches, avgs }: { matches: any[]; avgs: any }) {
  const [selectedPlayer, setSelectedPlayer] = useState<ATPPlayer | null>(null)
  const atp = selectedPlayer

  // Radar axes — 8 key dimensions, each normalised 0-100
  // normalise: map raw value to 0-100 scale where 100 = elite ceiling
  const norm = (v: number | null, min: number, max: number) =>
    v == null ? 0 : Math.min(100, Math.max(0, Math.round(((v - min) / (max - min)) * 100)))

  const radarAxes = [
    { label: '1ST SRV', jd: norm(avgs.s1_ad, 40, 80),       atp: norm(atp?.serve.first.pct_ad ?? null, 40, 80) },
    { label: 'SRV SPD', jd: norm(avgs.spd_s1_ad, 70, 220),   atp: norm(atp?.serve.first.spd_ad ?? null, 70, 220) },
    { label: '2ND SRV', jd: norm(avgs.s2_ad, 60, 95),        atp: norm(atp?.serve.second.pct_ad ?? null, 60, 95) },
    { label: 'RETURN',  jd: norm(avgs.ret1_ad, 60, 95),      atp: norm(atp?.return.first.pct_ad ?? null, 60, 95) },
    { label: 'FH CC',   jd: norm(avgs.fh_cc, 50, 95),        atp: norm(atp?.forehand.cc_in ?? null, 50, 95) },
    { label: 'BH CC',   jd: norm(avgs.bh_cc, 50, 95),        atp: norm(atp?.backhand.cc_in ?? null, 50, 95) },
    { label: 'BP GAME', jd: norm(avg(matches.map(m => m.shot_stats?.bp_saved_pct)), 30, 85), atp: norm(atp?.shot_stats.bp_saved_pct ?? null, 30, 85) },
    { label: 'WINNERS', jd: norm(avg(matches.map(m => m.shot_stats?.winners)), 5, 50),      atp: norm(atp?.shot_stats.winners ?? null, 5, 50) },
  ]

  // Comparison rows for the summary panel — ordered by importance
  const compRows: { label: string; jd: number | null; atp: number | null; unit: string; higherBetter: boolean; gT: number; aT: number }[] = [
    { label: '1st Serve %',     jd: avgs.s1_ad,    atp: atp?.serve.first.pct_ad ?? null,    unit: '%',    higherBetter: true,  gT: 75, aT: 60 },
    { label: '1st Srv Speed',   jd: avgs.spd_s1_ad, atp: atp?.serve.first.spd_ad ?? null,   unit: 'km/h', higherBetter: true,  gT: 185, aT: 160 },
    { label: '2nd Serve %',     jd: avgs.s2_ad,    atp: atp?.serve.second.pct_ad ?? null,   unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: '2nd Srv Speed',   jd: avgs.spd_s2_ad, atp: atp?.serve.second.spd_ad ?? null,  unit: 'km/h', higherBetter: true,  gT: 148, aT: 130 },
    { label: '1st Return %',    jd: avgs.ret1_ad,  atp: atp?.return.first.pct_ad ?? null,   unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: '2nd Return %',    jd: avgs.ret2_ad,  atp: atp?.return.second.pct_ad ?? null,  unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'FH CC In %',      jd: avgs.fh_cc,    atp: atp?.forehand.cc_in ?? null,        unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'FH DTL In %',     jd: avgs.fh_dtl,   atp: atp?.forehand.dtl_in ?? null,       unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'BH CC In %',      jd: avgs.bh_cc,    atp: atp?.backhand.cc_in ?? null,        unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'BH DTL In %',     jd: avgs.bh_dtl,   atp: atp?.backhand.dtl_in ?? null,       unit: '%',    higherBetter: true,  gT: 80, aT: 65 },
    { label: 'Winners / match', jd: avg(matches.map(m=>m.shot_stats?.winners)), atp: atp?.shot_stats.winners ?? null, unit: '', higherBetter: true, gT: 30, aT: 20 },
    { label: 'Unforced Errors', jd: avg(matches.map(m=>m.shot_stats?.ue)),      atp: atp?.shot_stats.ue ?? null,      unit: '', higherBetter: false, gT: 30, aT: 42 },
    { label: 'Double Faults',   jd: avg(matches.map(m=>m.shot_stats?.df)),      atp: atp?.shot_stats.df ?? null,      unit: '', higherBetter: false, gT: 3,  aT: 6 },
    { label: 'BP Saved %',      jd: avg(matches.map(m=>m.shot_stats?.bp_saved_pct)), atp: atp?.shot_stats.bp_saved_pct ?? null, unit: '%', higherBetter: true,  gT: 70, aT: 50 },
    { label: 'BP Won %',        jd: avg(matches.map(m=>m.shot_stats?.bp_won_pct)),   atp: atp?.shot_stats.bp_won_pct ?? null,   unit: '%', higherBetter: true,  gT: 50, aT: 35 },
  ]

  // Which rows does JD beat ATP on?
  const ahead = atp ? compRows.filter(r => r.jd != null && r.atp != null && (r.higherBetter ? r.jd >= r.atp : r.jd <= r.atp)) : []
  const behind = atp ? compRows.filter(r => r.jd != null && r.atp != null && (r.higherBetter ? r.jd < r.atp : r.jd > r.atp)) : []

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14, marginTop: 24, borderBottom: '1px solid #1a1a1a', paddingBottom: 8 }}>{title}</div>
  )

  const Card = ({ title, children }: any) => (
    <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )

  if (matches.length === 0) {
    return <div style={{ color: '#333', fontFamily: 'monospace', textAlign: 'center', padding: 60 }}>No matches yet. Upload your first match →</div>
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, color: '#e8d5b0' }}>JD Stats</div>
          <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 2 }}>Averages across {matches.length} matches</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>COMPARE VS</div>
          <select
            value={selectedPlayer?.name || ''}
            onChange={e => setSelectedPlayer(ATP_PLAYERS.find(p => p.name === e.target.value) || null)}
            style={{ background: '#161616', border: '1px solid #252525', borderRadius: 8, padding: '7px 12px', color: selectedPlayer ? '#e8d5b0' : '#555', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', minWidth: 180 }}
          >
            <option value=''>— Select ATP Player —</option>
            {ATP_PLAYERS.map(p => (
              <option key={p.name} value={p.name}>{p.nationality} #{p.rank} {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── RADAR + SUMMARY ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8, alignItems: 'start' }}>

        {/* Radar card */}
        <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>Player Profile</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart
              jdValues={radarAxes.map(a => a.jd)}
              atpValues={atp ? radarAxes.map(a => a.atp) : null}
              labels={radarAxes.map(a => a.label)}
            />
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
              <div style={{ width: 18, height: 2, background: '#4ade80', borderRadius: 1 }} />
              <span>JD</span>
            </div>
            {atp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
                <div style={{ width: 18, height: 2, background: '#fbbf24', borderRadius: 1, borderTop: '2px dashed #fbbf24' }} />
                <span>{atp.name.split(' ')[1]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary card */}
        <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>
            {atp ? `JD vs ${atp.name}` : 'Player Summary'}
          </div>

          {!atp ? (
            // Solo summary — JD strengths and weaknesses
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: G, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 }}>Strengths</div>
              {compRows.filter(r => r.jd != null && col(r.jd, r.gT, r.aT) === G).slice(0, 4).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: 12, color: '#777' }}>{r.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: G }}>{r.jd}{r.unit}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: R, textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 16, marginBottom: 8 }}>Areas to Improve</div>
              {compRows.filter(r => r.jd != null && col(r.jd, r.gT, r.aT) === R).slice(0, 4).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: 12, color: '#777' }}>{r.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: R }}>{r.jd}{r.unit}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#0e0e0e', borderRadius: 8, fontSize: 11, color: '#555', fontFamily: 'monospace', lineHeight: 1.6 }}>
                Select an ATP player above to compare directly.
              </div>
            </div>
          ) : (
            // Comparison summary
            <div>
              {/* Score pill */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(74,222,128,0.08)', borderRadius: 8, padding: '8px 4px', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: G }}>{ahead.length}</div>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>JD AHEAD</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(248,113,113,0.08)', borderRadius: 8, padding: '8px 4px', border: '1px solid rgba(248,113,113,0.15)' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: R }}>{behind.length}</div>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>NEED WORK</div>
                </div>
              </div>

              {/* Top gaps (biggest deltas) */}
              {(() => {
                const ranked = compRows
                  .filter(r => r.jd != null && r.atp != null)
                  .map(r => {
                    const delta = r.higherBetter ? (r.jd! - r.atp!) : (r.atp! - r.jd!)
                    return { ...r, delta }
                  })
                  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

                const top5pos = ranked.filter(r => r.delta > 0).slice(0, 3)
                const top5neg = ranked.filter(r => r.delta < 0).slice(0, 4)

                return (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, color: G, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>JD Edges</div>
                    {top5pos.length === 0 && <div style={{ fontSize: 11, color: '#333', fontFamily: 'monospace', marginBottom: 10 }}>None yet</div>}
                    {top5pos.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>{r.label}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: G }}>{r.jd}{r.unit}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#333' }}>vs</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{r.atp}{r.unit}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 9, color: G, background: 'rgba(74,222,128,0.1)', padding: '1px 5px', borderRadius: 4 }}>+{Math.abs(r.delta).toFixed(0)}</span>
                        </div>
                      </div>
                    ))}

                    <div style={{ fontSize: 10, letterSpacing: 1.5, color: R, textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 14, marginBottom: 6 }}>Biggest Gaps</div>
                    {top5neg.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < top5neg.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>{r.label}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: R }}>{r.jd}{r.unit}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#333' }}>vs</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{r.atp}{r.unit}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 9, color: R, background: 'rgba(248,113,113,0.1)', padding: '1px 5px', borderRadius: 4 }}>{Math.abs(r.delta).toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Legend bar */}
      {atp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#555', padding: '7px 12px', background: '#111', borderRadius: 6, marginBottom: 4, fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 6, borderRadius: 3, background: '#4ade80' }} />
            <span>JD average</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 14, borderRadius: 1, background: '#fff' }} />
            <span>{atp.name} (white marker)</span>
          </div>
        </div>
      )}

      {/* SERVE */}
      <SectionTitle title="Serve" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="1st Serve">
          <CompareBar label="Ad %" jd={avgs.s1_ad} atp={atp?.serve.first.pct_ad} gThresh={75} aThresh={60} />
          <CompareBar label="Deuce %" jd={avgs.s1_deuce} atp={atp?.serve.first.pct_deuce} gThresh={75} aThresh={60} />
          <CompareBar label="Ad Speed" jd={avgs.spd_s1_ad} atp={atp?.serve.first.spd_ad} gThresh={185} aThresh={160} suffix="km/h" maxVal={230} />
          <CompareBar label="Deuce Speed" jd={avgs.spd_s1_deuce} atp={atp?.serve.first.spd_deuce} gThresh={185} aThresh={160} suffix="km/h" maxVal={230} />
        </Card>
        <Card title="2nd Serve">
          <CompareBar label="Ad %" jd={avgs.s2_ad} atp={atp?.serve.second.pct_ad} gThresh={80} aThresh={65} />
          <CompareBar label="Deuce %" jd={avgs.s2_deuce} atp={atp?.serve.second.pct_deuce} gThresh={80} aThresh={65} />
          <CompareBar label="Ad Speed" jd={avgs.spd_s2_ad} atp={atp?.serve.second.spd_ad} gThresh={148} aThresh={130} suffix="km/h" maxVal={180} />
          <CompareBar label="Deuce Speed" jd={avgs.spd_s2_deuce} atp={atp?.serve.second.spd_deuce} gThresh={148} aThresh={130} suffix="km/h" maxVal={180} />
        </Card>
      </div>

      {/* RETURN */}
      <SectionTitle title="Return" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="1st Return Won %">
          <CompareBar label="Ad" jd={avgs.ret1_ad} atp={atp?.return.first.pct_ad} gThresh={80} aThresh={65} />
          <CompareBar label="Deuce" jd={avgs.ret1_deuce} atp={atp?.return.first.pct_deuce} gThresh={80} aThresh={65} />
        </Card>
        <Card title="2nd Return Won %">
          <CompareBar label="Ad" jd={avgs.ret2_ad} atp={atp?.return.second.pct_ad} gThresh={80} aThresh={65} />
          <CompareBar label="Deuce" jd={avgs.ret2_deuce} atp={atp?.return.second.pct_deuce} gThresh={80} aThresh={65} />
        </Card>
      </div>

      {/* SHOT STATS */}
      <SectionTitle title="Shot Stats" />
      <Card title="Match Averages">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Winners', val: avg(matches.map(m => m.shot_stats?.winners)), atp: atp?.shot_stats.winners },
            { label: 'Unf. Errors', val: avg(matches.map(m => m.shot_stats?.ue)), atp: atp?.shot_stats.ue },
            { label: 'Dbl Faults', val: avg(matches.map(m => m.shot_stats?.df)), atp: atp?.shot_stats.df },
            { label: 'BP Saved %', val: avg(matches.map(m => m.shot_stats?.bp_saved_pct)), atp: atp?.shot_stats.bp_saved_pct },
            { label: 'BP Won %', val: avg(matches.map(m => m.shot_stats?.bp_won_pct)), atp: atp?.shot_stats.bp_won_pct },
          ].map(({ label, val, atp: atpVal }, i) => (
            <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: val == null ? '#333' : '#e8d5b0' }}>{val ?? '—'}</div>
              {atpVal != null && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', marginTop: 2 }}>ATP: {atpVal}</div>}
              <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3, fontFamily: 'monospace' }}>{label}</div>
            </div>
          ))}
        </div>
        <CompareBar label="BP Saved %" jd={avg(matches.map(m => m.shot_stats?.bp_saved_pct))} atp={atp?.shot_stats.bp_saved_pct} gThresh={70} aThresh={50} />
        <CompareBar label="BP Won %" jd={avg(matches.map(m => m.shot_stats?.bp_won_pct))} atp={atp?.shot_stats.bp_won_pct} gThresh={50} aThresh={35} />
      </Card>

      {/* FOREHAND / BACKHAND */}
      <SectionTitle title="Ground Strokes" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Forehand">
          <CompareBar label="CC In %" jd={avgs.fh_cc} atp={atp?.forehand.cc_in} gThresh={80} aThresh={65} />
          <CompareBar label="DTL In %" jd={avgs.fh_dtl} atp={atp?.forehand.dtl_in} gThresh={80} aThresh={65} />
          <CompareBar label="CC Speed" jd={avgs.spd_fh_cc} atp={atp?.forehand.spd_cc} gThresh={125} aThresh={110} suffix="km/h" maxVal={160} />
          <CompareBar label="DTL Speed" jd={avgs.spd_fh_dtl} atp={atp?.forehand.spd_dtl} gThresh={130} aThresh={115} suffix="km/h" maxVal={160} />
        </Card>
        <Card title="Backhand">
          <CompareBar label="CC In %" jd={avgs.bh_cc} atp={atp?.backhand.cc_in} gThresh={80} aThresh={65} />
          <CompareBar label="DTL In %" jd={avgs.bh_dtl} atp={atp?.backhand.dtl_in} gThresh={80} aThresh={65} />
          <CompareBar label="CC Speed" jd={avgs.spd_bh_cc} atp={atp?.backhand.spd_cc} gThresh={118} aThresh={105} suffix="km/h" maxVal={160} />
          <CompareBar label="DTL Speed" jd={avgs.spd_bh_dtl} atp={atp?.backhand.spd_dtl} gThresh={122} aThresh={108} suffix="km/h" maxVal={160} />
        </Card>
      </div>

      {/* Context note */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 10, color: '#333', fontFamily: 'monospace', lineHeight: 1.6 }}>
        ⚠ ATP stats are 2024-25 season tour averages. Forehand/backhand direction splits are tour-average estimates (not publicly available per player). Serve speeds shown in km/h.
      </div>
    </div>
  )
}

// ─── NEXT MATCH STRATEGY ──────────────────────────────────────────────────────
function NextMatchStrategy({ matches }: { matches: any[]; avgs: any }) {
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')
  const [oppStyle, setOppStyle] = useState('')           // baseliner|serveVolley|allCourt|pusher|bigServer|''
  const [isLefty, setIsLefty] = useState<'yes'|'no'|''>('')
  const [surface, setSurface] = useState('')             // clay|hard|grass|''

  const utr = parseFloat(oppUtr)
  const utrValid = !isNaN(utr) && utr > 0

  // ── DATA PREP ────────────────────────────────────────────────────────────────

  // Sort newest first — needed for recency weighting
  const byDate = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Weighted average: last 5 matches get 2× weight, older 1×
  const wAvg = (fn: (m: any) => number | null | undefined): number | null => {
    const entries: { v: number; w: number }[] = []
    byDate.forEach((m, i) => {
      const v = fn(m)
      if (v != null && !isNaN(Number(v))) entries.push({ v: Number(v), w: i < 5 ? 2 : 1 })
    })
    if (!entries.length) return null
    const wSum = entries.reduce((s, e) => s + e.w, 0)
    return Math.round(entries.reduce((s, e) => s + e.v * e.w, 0) / wSum)
  }

  // Past opponents dropdown
  const pastOpponents = Array.from(
    new Map(matches.filter(m => m.opponent?.name).map(m => [m.opponent.name, m.opponent])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name))

  // Matches vs selected opponent
  const historyMatches = oppName ? matches.filter(m => m.opponent?.name === oppName) : []
  const isKnown = historyMatches.length > 0
  const knownWins = historyMatches.filter(m => m.score?.winner === 'JD').length
  const knownLosses = historyMatches.length - knownWins
  const knownWinRate = historyMatches.length ? Math.round(knownWins / historyMatches.length * 100) : null

  // Matches vs similar UTR opponents (±0.5)
  const similarMatches = utrValid
    ? matches.filter(m => m.opponent?.utr != null && Math.abs(m.opponent.utr - utr) <= 0.5)
    : []
  const simWins = similarMatches.filter(m => m.score?.winner === 'JD').length
  const simWinRate = similarMatches.length ? Math.round(simWins / similarMatches.length * 100) : null

  // JD's weighted stats (recency-adjusted)
  const jd = {
    s1Ad:    wAvg(m => m.serve?.first?.pct_ad),
    s1Deuce: wAvg(m => m.serve?.first?.pct_deuce),
    s2Ad:    wAvg(m => m.serve?.second?.pct_ad),
    spd2:    wAvg(m => m.serve?.second?.spd_ad),
    ret1Ad:  wAvg(m => m.return?.first?.pct_ad),
    ret2Ad:  wAvg(m => m.return?.second?.pct_ad),
    fhCC:    wAvg(m => m.forehand?.cc_in),
    fhDTL:   wAvg(m => m.forehand?.dtl_in),
    bhCC:    wAvg(m => m.backhand?.cc_in),
    bhDTL:   wAvg(m => m.backhand?.dtl_in),
    winners: wAvg(m => m.shot_stats?.winners),
    ue:      wAvg(m => m.shot_stats?.ue),
    df:      wAvg(m => m.shot_stats?.df),
    bpSaved: wAvg(m => m.shot_stats?.bp_saved_pct),
    bpWon:   wAvg(m => m.shot_stats?.bp_won_pct),
  }

  // Stats in wins vs losses vs known opponent
  const vsWins  = historyMatches.filter(m => m.score?.winner === 'JD')
  const vsLosses = historyMatches.filter(m => m.score?.winner !== 'JD')
  const vsAvg   = (fn: (m: any) => any) => avg(historyMatches.map(fn))
  const vsWinAvg  = (fn: (m: any) => any) => avg(vsWins.map(fn))
  const vsLossAvg = (fn: (m: any) => any) => avg(vsLosses.map(fn))

  // Stats vs similar-UTR opponents
  const simAvg = (fn: (m: any) => any) => avg(similarMatches.map(fn))

  // JD weakness flags (recency-weighted)
  const weak = {
    serveAd:  jd.s1Ad  != null && jd.s1Ad  < 68,
    df:       jd.df    != null && jd.df    > 3.5,
    bhDTL:    jd.bhDTL != null && jd.bhDTL < 72,
    ue:       jd.ue    != null && jd.ue    > 20,
    bpSaved:  jd.bpSaved != null && jd.bpSaved < 60,
    ret1:     jd.ret1Ad != null && jd.ret1Ad < 70,
  }
  const strong = {
    fhCC: jd.fhCC != null && jd.fhCC >= 78,
    s2:   jd.s2Ad != null && jd.s2Ad >= 78,
    ret2: jd.ret2Ad != null && jd.ret2Ad >= 78,
    bhCC: jd.bhCC != null && jd.bhCC >= 75,
  }

  // ── LOOKUP TABLES ────────────────────────────────────────────────────────────

  // Serve placement — changes completely with handedness
  const lefty = isLefty === 'yes'
  const serveAd = {
    primary:   lefty ? 'T (into their backhand)' : 'Wide (to their backhand)',
    secondary: lefty ? 'Body (jam their forehand)' : 'Body (jam their forehand)',
    avoid:     lefty ? 'Wide — goes to their forehand, sets up their attack' : 'T — goes to their forehand',
  }
  const serveDeuce = {
    primary:   lefty ? 'Wide (big angle — into their backhand)' : 'T (to their backhand)',
    secondary: lefty ? 'T (to their forehand — use sparingly)' : 'Wide (opens court)',
    avoid:     lefty ? 'T often feeds their forehand' : 'Body only — use for surprise, not default',
  }

  // Style playbook
  type StyleData = { label: string; threat: string; returnTactic: string; rallyTactic: string; watchOut: string }
  const styleMap: Record<string, StyleData> = {
    baseliner: {
      label: 'Baseliner',
      threat: 'Consistent from the back — heavy topspin, good depth, will outlast you in long rallies.',
      returnTactic: 'Return deep CC to their BH. Get to neutral first — don\'t gamble on an early winner.',
      rallyTactic: 'BH CC deep to push them behind the baseline → wait for the short ball → attack FH inside-out CC or DTL.',
      watchOut: 'Don\'t try to out-rally them. Attack the first medium-pace ball — don\'t wait for the perfect ball.',
    },
    serveVolley: {
      label: 'Serve & Volleyer',
      threat: 'Serve and charge the net. Short, sharp points. Uncomfortable if your return isn\'t precise.',
      returnTactic: 'Return low and at their feet. Chip-and-charge back or lob over them when pinned back.',
      rallyTactic: 'If they come in, pass low DTL or lob crosscourt. Take the net yourself when they stay back.',
      watchOut: 'Don\'t go for too much on the return — low and in beats trying to blast it past them.',
    },
    allCourt: {
      label: 'All-Court',
      threat: 'Comfortable everywhere — can hurt you from the back, mid-court, or at the net. No obvious weakness.',
      returnTactic: 'Deep CC, stay disciplined. Make them earn every ball — don\'t gift them errors.',
      rallyTactic: 'Out-compete them with consistency and court position. Win the rally, then attack when FH CC opens the court.',
      watchOut: 'Going for too much too early. Control the tempo — let them make the first mistake.',
    },
    pusher: {
      label: 'Pusher',
      threat: 'Every ball comes back, high and heavy. Will frustrate you into errors — that\'s their entire game plan.',
      returnTactic: 'Attack 2nd serve immediately. Step inside and drive — don\'t let them reset into their rhythm.',
      rallyTactic: 'Attack short balls early. Come in, volley, close the point. Don\'t stay back and rally with a pusher.',
      watchOut: 'Getting pulled into slow exchanges. The moment you start rallying patiently with them, they win.',
    },
    bigServer: {
      label: 'Big Server',
      threat: 'Serve is their weapon — hard to get into rallies. Very dangerous on 1st serve, vulnerable on 2nd.',
      returnTactic: 'Block deep to their body on 1st serve — depth matters, not pace. Attack every 2nd serve by stepping inside.',
      rallyTactic: 'Survive the serve, extend the rally. Grind on their 2nd serve game — that\'s where you break them.',
      watchOut: 'Trying to blast their big serve back. Deep and in is your return goal — get in the rally first.',
    },
  }

  // Surface modifiers
  type SurfaceData = { serveNote: string; rallyNote: string; patternNote: string; tbNote: string }
  const surfaceMap: Record<string, SurfaceData> = {
    clay: {
      serveNote: 'Kick 2nd serve high to their BH — extra bounce off clay makes it harder to attack. 1st serve % matters more than pace.',
      rallyNote: 'BH CC depth is your weapon on clay — pushes them behind the baseline and opens the court.',
      patternNote: 'Be patient. Build the rally, wait for the right ball to attack. Don\'t force on clay.',
      tbNote: 'Clay tiebreaks favour the more consistent player — slow it down, go for 70% pace, don\'t spray.',
    },
    hard: {
      serveNote: 'Pace counts on hard courts. Flat wide serves stay low — use them. Lead with serve + 1 patterns.',
      rallyNote: 'Hard court rewards aggression — step in early, take the ball on the rise, attack mid-court.',
      patternNote: 'Serve + 1: force a weak return → inside-out FH CC. Keep points short.',
      tbNote: 'Hard court tiebreaks are decided by the serve. Go for your serve — don\'t coast to 2nd serve.',
    },
    grass: {
      serveNote: 'Serve is king on grass. Go T on both sides — the low bounce amplifies a flat serve.',
      rallyNote: 'Come in on short balls. Slice BH keeps the ball skidding low — hard for them to attack.',
      patternNote: 'Short, sharp points. Mix in serve + volley occasionally to force them into uncomfortable positions.',
      tbNote: 'Grass tiebreaks are fast and chaotic. Trust your serve. First to 5 with confidence wins.',
    },
  }

  // ── STRATEGY BUILDER ─────────────────────────────────────────────────────────
  const sd = oppStyle ? styleMap[oppStyle] : null
  const surf = surface ? surfaceMap[surface] : null

  interface CardData { n: string; title: string; stat: string; body: string; action: string }
  const buildCards = (): CardData[] => {
    const cards: CardData[] = []

    // ── CARD 01: OPPONENT READ ────────────────────────────────────────────────
    const parts01: string[] = []
    let stat01 = ''
    let action01 = ''

    if (isKnown) {
      stat01 = `Head-to-head: ${knownWins}W ${knownLosses}L · Win rate ${knownWinRate}%`
      // Detect win/loss patterns from the data
      const winUe   = vsWinAvg(m => m.shot_stats?.ue)
      const lossUe  = vsLossAvg(m => m.shot_stats?.ue)
      const winS1   = vsWinAvg(m => m.serve?.first?.pct_ad)
      const lossS1  = vsLossAvg(m => m.serve?.first?.pct_ad)
      const winRet  = vsWinAvg(m => m.return?.first?.pct_ad)
      const lossRet = vsLossAvg(m => m.return?.first?.pct_ad)

      if (winUe != null && lossUe != null && lossUe - winUe > 3)
        parts01.push(`UE spikes in your losses: ${lossUe} vs ${winUe} in wins — errors are costing you this matchup.`)
      if (winS1 != null && lossS1 != null && winS1 - lossS1 > 5)
        parts01.push(`1st serve Ad drops to ${lossS1}% in losses vs ${winS1}% in wins — your serve dictates the result.`)
      if (winRet != null && lossRet != null && winRet - lossRet > 5)
        parts01.push(`Return is ${winRet}% in wins vs ${lossRet}% in losses — start aggressively or you'll be on the back foot.`)
      if (parts01.length === 0)
        parts01.push(historyMatches.length === 1
          ? 'Only one match on record — use all data points below to build your plan.'
          : `${historyMatches.length} matches played. Review the pattern — execution consistency is the differentiator.`)
      if (sd) parts01.push(`Style: ${sd.threat}`)

      // Aggregate opponent shot tendencies from all matches vs them
      const oppShotMatches = historyMatches.filter(m => m.opp_shots != null)
      if (oppShotMatches.length > 0) {
        const oppS1Ad  = avg(oppShotMatches.map(m => m.opp_shots?.serve?.first?.pct_ad))
        const oppBhCC  = avg(oppShotMatches.map(m => m.opp_shots?.backhand?.cc_in))
        const oppFhCC  = avg(oppShotMatches.map(m => m.opp_shots?.forehand?.cc_in))
        const oppUE    = avg(oppShotMatches.map(m => m.opp_shots?.stats?.ue))
        const oppSpd   = avg(oppShotMatches.map(m => m.opp_shots?.serve?.first?.spd_ad))
        const oppS2Won = avg(oppShotMatches.map(m => m.opp_shots?.stats?.s2_pts_won_pct))

        if (oppS1Ad != null) parts01.push(`Their 1st serve: ${oppS1Ad}% in — ${oppS1Ad < 55 ? 'low, expect lots of 2nd serves' : oppS1Ad < 65 ? 'average' : 'reliable — read direction early'}.`)
        if (oppSpd != null) parts01.push(`Serve speed: avg ${oppSpd} km/h — ${oppSpd < 100 ? 'slow — step in and attack' : oppSpd < 130 ? 'medium pace' : 'heavy — block deep, don\'t swing big'}.`)
        if (oppBhCC != null && oppBhCC < 65) parts01.push(`Their BH CC at ${oppBhCC}% — they miss it often. Push them wide to their backhand.`)
        if (oppUE != null) parts01.push(`They averaged ${oppUE} UE — ${oppUE > 35 ? 'error-prone, stay consistent and let them self-destruct' : 'disciplined player, you need to create your own opportunities'}.`)
        if (oppS2Won != null) parts01.push(`Their 2nd serve points won: ${oppS2Won}% — ${oppS2Won < 40 ? 'attack their 2nd serve, it\'s a free point' : 'they hold well even on 2nd serve — step in early'}.`)
      }

      action01 = knownWinRate != null && knownWinRate >= 50
        ? `YOU\'VE BEATEN THEM BEFORE — EXECUTE THE SAME PLAN. DON\'T REINVENT THE WHEEL.`
        : `MORE LOSSES THAN WINS — SOMETHING MUST CHANGE. START WITH YOUR SERVE AND UE COUNT.`
    } else {
      const simCtx = similarMatches.length >= 2 && simWinRate != null
        ? ` Against UTR ${(utr - 0.5).toFixed(1)}–${(utr + 0.5).toFixed(1)} opponents you\'re ${simWinRate}% (${simWins}W ${similarMatches.length - simWins}L).`
        : ''
      if (utr < 2.5) stat01 = `UTR ${utr.toFixed(1)} — Below your level. Win this convincingly.`
      else if (utr < 3.3) stat01 = `UTR ${utr.toFixed(1)} — Your level. Errors decide the match.`
      else if (utr < 4.0) stat01 = `UTR ${utr.toFixed(1)} — Slightly above your level. Compete hard.`
      else stat01 = `UTR ${utr.toFixed(1)} — Strong player. Nothing to lose — go for your shots.`
      if (simCtx) parts01.push(simCtx.trim())
      if (sd) parts01.push(`Playing style: ${sd.threat}`)
      else parts01.push('Add a playing style above for more specific tactical advice.')

      // Aggregate opponent shot tendencies from similar-UTR matches
      const simOppShotMatches = similarMatches.filter(m => m.opp_shots != null)
      if (simOppShotMatches.length > 0) {
        const oppS1Ad  = avg(simOppShotMatches.map(m => m.opp_shots?.serve?.first?.pct_ad))
        const oppBhCC  = avg(simOppShotMatches.map(m => m.opp_shots?.backhand?.cc_in))
        const oppUE    = avg(simOppShotMatches.map(m => m.opp_shots?.stats?.ue))
        const oppSpd   = avg(simOppShotMatches.map(m => m.opp_shots?.serve?.first?.spd_ad))
        const oppS2Won = avg(simOppShotMatches.map(m => m.opp_shots?.stats?.s2_pts_won_pct))

        if (oppS1Ad != null) parts01.push(`Similar UTR opponents avg 1st serve: ${oppS1Ad}% — ${oppS1Ad < 55 ? 'expect lots of 2nd serves, attack them' : oppS1Ad < 65 ? 'average serve, read direction early' : 'reliable servers at this level — stay sharp'}.`)
        if (oppSpd != null) parts01.push(`Avg serve speed at this UTR: ${oppSpd} km/h — ${oppSpd < 100 ? 'slow — step in and attack' : oppSpd < 130 ? 'medium pace' : 'heavy — block deep'}.`)
        if (oppBhCC != null && oppBhCC < 65) parts01.push(`Opponents at this level avg BH CC at ${oppBhCC}% — push wide to their backhand.`)
        if (oppUE != null) parts01.push(`Similar opponents avg ${oppUE} UE — ${oppUE > 35 ? 'error-prone level, stay consistent' : 'disciplined at this UTR, create your own chances'}.`)
        if (oppS2Won != null) parts01.push(`Their 2nd serve pts won avg ${oppS2Won}% at this UTR — ${oppS2Won < 40 ? 'attack 2nd serves hard' : 'they compete well on 2nd serve — stay aggressive'}.`)
      }

      action01 = utr >= 3.5
        ? 'COMPETE WITH NOTHING TO LOSE — YOUR BEST TENNIS WINS HERE, NOT SAFE TENNIS'
        : 'EXECUTE YOUR GAME — THE DATA SHOWS YOU CAN WIN AT THIS LEVEL'
    }

    cards.push({ n: '01', title: isKnown ? `Reading ${oppName}` : 'Reading the Opponent', stat: stat01, body: parts01.join(' '), action: action01 })

    // ── CARD 02: SERVE ────────────────────────────────────────────────────────
    const parts02: string[] = []
    // Handedness-specific targets
    if (isLefty !== '') {
      parts02.push(`Ad court: lead with ${serveAd.primary}. Mix in ${serveAd.secondary}. Avoid ${serveAd.avoid}.`)
      parts02.push(`Deuce court: ${serveDeuce.primary}. Secondary: ${serveDeuce.secondary}.`)
    } else {
      parts02.push('Ad court: Wide to BH or Body to jam. Commit to the target before the toss — no last-second changes.')
      parts02.push('Deuce court: T to their BH or Wide to open the court.')
    }
    if (surf?.serveNote) parts02.push(surf.serveNote)
    if (weak.df) parts02.push(`Double faults avg ${jd.df} per match — slow your 2nd serve down, spin it in, don't go for too much.`)
    // Compare serve % vs this opponent vs overall
    if (isKnown) {
      const vs1 = vsAvg(m => m.serve?.first?.pct_ad)
      if (vs1 != null && jd.s1Ad != null) {
        if (vs1 < jd.s1Ad - 5) parts02.push(`Your 1st serve drops to ${vs1}% vs ${oppName} (normally ${jd.s1Ad}%) — they pressure your serve. Extra focus pre-toss.`)
        else if (vs1 > jd.s1Ad + 3) parts02.push(`Serve is actually better vs ${oppName} (${vs1}% vs avg ${jd.s1Ad}%) — lead with it aggressively.`)
      }
    } else if (similarMatches.length >= 2) {
      const simS1 = simAvg(m => m.serve?.first?.pct_ad)
      if (simS1 != null && jd.s1Ad != null && simS1 < jd.s1Ad - 5)
        parts02.push(`Your 1st serve tends to drop vs this UTR bracket (avg ${simS1}% here vs ${jd.s1Ad}% overall) — conscious pre-toss routine.`)
    }
    const stat02 = jd.s1Ad != null
      ? `Weighted 1st serve Ad: ${jd.s1Ad}%${jd.s1Deuce != null ? ` · Deuce: ${jd.s1Deuce}%` : ''} · 2nd serve: ${jd.s2Ad ?? '—'}%`
      : 'Serve data building...'
    const action02 = weak.serveAd
      ? `AD SERVE AT ${jd.s1Ad}% — BELOW 68% TARGET. ONE TARGET. COMMIT BEFORE THE TOSS.`
      : `SERVE IS SOLID (${jd.s1Ad}%) — LEAD WITH IT. SET UP BALL 2 WITH YOUR 1ST SERVE.`
    cards.push({ n: '02', title: 'Serve Plan', stat: stat02, body: parts02.join(' '), action: action02 })

    // ── CARD 03: RETURN ───────────────────────────────────────────────────────
    const parts03: string[] = []
    if (sd) {
      parts03.push(sd.returnTactic)
    } else {
      parts03.push('Return deep CC to their backhand — depth over pace. Get to neutral first.')
      parts03.push('Attack every 2nd serve: step inside the baseline and drive.')
    }
    if (surf?.rallyNote) parts03.push(surf.rallyNote)
    if (isKnown) {
      const vsR1 = vsAvg(m => m.return?.first?.pct_ad)
      if (vsR1 != null && jd.ret1Ad != null) {
        if (vsR1 > jd.ret1Ad + 5) parts03.push(`Your return is actually better vs ${oppName} (${vsR1}% vs avg ${jd.ret1Ad}%) — be aggressive from ball one.`)
        else if (vsR1 < jd.ret1Ad - 5) parts03.push(`Return struggles vs ${oppName}: ${vsR1}% (avg is ${jd.ret1Ad}%) — focus on depth, not winners.`)
      }
    }
    const stat03 = jd.ret1Ad != null
      ? `Weighted return won: 1st ${jd.ret1Ad}%${jd.ret2Ad != null ? ` · 2nd ${jd.ret2Ad}%` : ''}`
      : 'Return data building...'
    const action03 = sd?.returnTactic
      ? (oppStyle === 'serveVolley' ? 'LOW AT FEET OR LOB — DON\'T GIVE THEM A HIGH BALL TO VOLLEY'
        : oppStyle === 'pusher' ? 'ATTACK THEIR 2ND SERVE. COME IN ON SHORT BALLS.'
        : 'DEEP CC → STEP IN ON BALL 3')
      : 'DEEP CC RETURN → STEP IN ON BALL 3'
    cards.push({ n: '03', title: 'Return Game', stat: stat03, body: parts03.join(' '), action: action03 })

    // ── CARD 04: PATTERN OF PLAY ──────────────────────────────────────────────
    const parts04: string[] = []
    if (sd) {
      parts04.push(sd.rallyTactic)
    } else if (strong.fhCC) {
      parts04.push(`FH CC is your strongest shot (${jd.fhCC}% weighted avg) — use it as the primary weapon. Build with depth → FH CC to open court → attack inside-out.`)
    } else {
      parts04.push('Build the rally deep with BH CC → wait for a mid-court ball → attack with FH.')
    }
    if (surf?.patternNote) parts04.push(surf.patternNote)
    // What worked vs known opponent in wins
    if (isKnown && vsWins.length > 0) {
      const winFhCC = vsWinAvg(m => m.forehand?.cc_in)
      const winBhCC = vsWinAvg(m => m.backhand?.cc_in)
      if (winFhCC != null) parts04.push(`In your ${knownWins} win${knownWins > 1 ? 's' : ''} vs ${oppName}: FH CC was ${winFhCC}%${winBhCC != null ? `, BH CC ${winBhCC}%` : ''} — prioritise those patterns.`)
    }
    if (similarMatches.length >= 2 && simWinRate != null) {
      if (simWinRate < 40) parts04.push(`This UTR bracket has been tough (${simWinRate}% win rate) — stay patient, reduce UE, don\'t force the play.`)
      else if (simWinRate >= 70) parts04.push(`You handle this UTR level well (${simWinRate}%) — play your game with confidence.`)
    }
    const stat04 = `FH CC: ${jd.fhCC ?? '—'}% · BH CC: ${jd.bhCC ?? '—'}% · BH DTL: ${jd.bhDTL ?? '—'}% · Winners avg: ${jd.winners ?? '—'}`
    const watchOut04 = sd?.watchOut
      ?? (weak.ue ? `UE AVG IS ${jd.ue} — SLOW DOWN, HIT 70% PACE WHEN UNDER PRESSURE` : 'ATTACK THE FIRST SHORT BALL — DON\'T WAIT FOR THE PERFECT OPPORTUNITY')
    cards.push({ n: '04', title: 'Pattern of Play', stat: stat04, body: parts04.join(' '), action: `WATCH OUT: ${watchOut04}` })

    // ── CARD 05: PRESSURE MOMENTS ─────────────────────────────────────────────
    const parts05: string[] = []
    parts05.push(surf?.tbNote ?? 'Slow down on big points. Pick a target, commit, execute.')
    if (weak.bpSaved) parts05.push(`BP saved at ${jd.bpSaved}% weighted — below 60% is critical. On deuce/ad: serve body or T, follow with FH CC.`)
    if (isKnown && historyMatches.length >= 2) {
      const winBp = vsWinAvg(m => m.shot_stats?.bp_saved_pct)
      const lossBp = vsLossAvg(m => m.shot_stats?.bp_saved_pct)
      if (winBp != null && lossBp != null && winBp - lossBp > 10)
        parts05.push(`BP saved: ${winBp}% in wins vs ${lossBp}% in losses vs ${oppName} — saving BPs is the deciding factor in this matchup.`)
    }
    const stat05 = `BP saved: ${jd.bpSaved ?? '—'}% · BP won: ${jd.bpWon ?? '—'}% (weighted)`
    const action05 = `ON BIG POINTS: ONE BREATH. ONE TARGET. COMMIT FULLY.`
    cards.push({ n: '05', title: 'Pressure & Tiebreaks', stat: stat05, body: parts05.join(' '), action: action05 })

    return cards
  }

  const focusCards = (utrValid || isKnown) ? buildCards() : []

  // Match plan rows
  const buildPlan = () => [
    { l: '1st serve Ad',   v: isLefty !== '' ? `${serveAd.primary}. Mix: ${serveAd.secondary}` : `Wide or Body — pick before the toss. Target: ${jd.s1Ad ?? '—'}%+` },
    { l: '1st serve Deuce', v: isLefty !== '' ? `${serveDeuce.primary}` : `T (to BH) or Wide (opens court)` },
    { l: '2nd serve',       v: surf?.serveNote ? surf.serveNote.split('.')[0] : `Kick to body. Weighted avg: ${jd.s2Ad ?? '—'}%. Don't overthink.` },
    { l: 'Return 1st',      v: sd ? sd.returnTactic.split('.')[0] : 'Block deep CC. Depth over pace.' },
    { l: 'Rally pattern',   v: sd ? sd.rallyTactic.split('.')[0] : `Deep BH CC → wait → attack FH` },
    { l: 'Pressure points', v: `Slow down. One target. Commit. BP saved: ${jd.bpSaved ?? '—'}% weighted avg.` },
  ]

  // ── RENDER HELPERS ───────────────────────────────────────────────────────────
  const inp = (extra: any = {}) => ({
    background: '#161616', border: '1px solid #252525', borderRadius: 8,
    padding: '10px 14px', color: '#e8d5b0', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, ...extra,
  })
  const pillBtn = (active: boolean, color = G) => ({
    padding: '5px 11px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
    letterSpacing: 0.5, cursor: 'pointer', border: `1px solid ${active ? color : '#252525'}`,
    background: active ? `${color}18` : '#161616', color: active ? color : '#444',
  })

  const FocusCard = ({ n, title, stat, body, action }: any) => (
    <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginBottom: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 44, color: '#1e1e1e', lineHeight: 1, flexShrink: 0, width: 40 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e8d5b0', marginBottom: 6 }}>{title}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#444', background: '#1a1a1a', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 8 }}>{stat}</div>
        <div style={{ fontSize: 13, color: '#777', lineHeight: 1.65, marginBottom: 10 }}>{body}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: A, background: AD, padding: '5px 10px', borderRadius: 4, display: 'inline-block' }}>{action}</div>
      </div>
    </div>
  )
  const PlanRow = ({ l, v, last }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: last ? 'none' : '1px solid #1a1a1a', gap: 16 }}>
      <span style={{ fontSize: 12, color: '#444', minWidth: 140, flexShrink: 0 }}>{l}</span>
      <span style={{ fontSize: 12, color: '#999', textAlign: 'right' }}>{v}</span>
    </div>
  )

  const ready = utrValid || isKnown

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, letterSpacing: 3, color: '#e8d5b0' }}>Next Match Strategy</div>
        <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 4 }}>
          {matches.length > 0 ? `${matches.length} matches · last 5 weighted 2× · updated after every session` : 'Add your first match to get personalised strategy'}
        </div>
      </div>

      {/* ── INPUTS ── */}
      <div style={{ background: '#141414', border: '1px solid #252525', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 16 }}>Next Opponent</div>

        {/* Row 1: opponent + UTR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>OPPONENT <span style={{ color: '#2a2a2a' }}>optional</span></div>
            <select
              value={oppName}
              onChange={e => {
                const name = e.target.value
                setOppName(name)
                if (name) {
                  const lastM = matches.filter(m => m.opponent?.name === name).slice(-1)[0]
                  if (lastM?.opponent?.utr) setOppUtr(String(lastM.opponent.utr))
                }
              }}
              style={inp({ cursor: 'pointer', appearance: 'none' as any, color: oppName ? '#e8d5b0' : '#555' })}
            >
              <option value=''>— New opponent —</option>
              {pastOpponents.map((p: any) => {
                const pm = matches.filter(m => m.opponent?.name === p.name)
                const pw = pm.filter(m => m.score?.winner === 'JD').length
                return <option key={p.name} value={p.name}>{p.name}{p.utr ? ` · UTR ${p.utr}` : ''} ({pw}W {pm.length - pw}L)</option>
              })}
            </select>
            {isKnown && <div style={{ marginTop: 5, fontSize: 10, fontFamily: 'monospace', color: G }}>✓ {historyMatches.length} match{historyMatches.length > 1 ? 'es' : ''} · {knownWins}W {knownLosses}L</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>UTR LEVEL <span style={{ color: A, marginLeft: 4 }}>required</span></div>
            <input value={oppUtr} onChange={e => setOppUtr(e.target.value)} placeholder="e.g. 3.2" type="number" step="0.1" min="0" max="16"
              style={inp({ borderColor: oppUtr && !utrValid ? R : '#252525' })} />
            {utrValid && <div style={{ marginTop: 5, fontSize: 10, fontFamily: 'monospace', color: '#555' }}>
              {utr < 2.5 ? 'Below your level' : utr < 3.3 ? 'Around your level (~3.1 est.)' : utr < 4.0 ? 'Above your level' : 'Well above — tough match'}
              {simWinRate != null && similarMatches.length >= 2 ? ` · ${simWinRate}% vs similar UTR` : ''}
            </div>}
          </div>
        </div>

        {/* Row 2: surface + style + lefty — all optional */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 10 }}>Optional — add these for a sharper plan</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: 16 }}>
            {/* Surface */}
            <div>
              <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>SURFACE</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['clay', 'hard', 'grass'] as const).map(s => (
                  <button key={s} onClick={() => setSurface(surface === s ? '' : s)} style={pillBtn(surface === s, '#c084fc')}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* Style */}
            <div>
              <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>PLAYING STYLE</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as any }}>
                {(['baseliner', 'serveVolley', 'allCourt', 'pusher', 'bigServer'] as const).map(s => (
                  <button key={s} onClick={() => setOppStyle(oppStyle === s ? '' : s)} style={pillBtn(oppStyle === s, B)}>
                    {styleMap[s].label}
                  </button>
                ))}
              </div>
            </div>
            {/* Lefty */}
            <div>
              <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>HANDEDNESS</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['no', 'yes'] as const).map(v => (
                  <button key={v} onClick={() => setIsLefty(isLefty === v ? '' : v)} style={pillBtn(isLefty === v, A)}>
                    {v === 'yes' ? 'Lefty' : 'Right-handed'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No input yet */}
      {!ready && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#2a2a2a', fontFamily: 'monospace', fontSize: 12 }}>
          Enter opponent UTR above to generate your match strategy ↑
        </div>
      )}

      {/* ── STRATEGY CONTENT ── */}
      {ready && (
        <>
          {/* Matchup banner */}
          <div style={{ background: '#141414', border: '1px solid #252525', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as any, gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#444', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>Matchup</div>
              <div style={{ fontSize: 14, color: '#e8d5b0', fontWeight: 600 }}>
                {oppName || 'New Opponent'}{utrValid ? ` · UTR ${utr.toFixed(1)}` : ''}{sd ? ` · ${sd.label}` : ''}{isLefty === 'yes' ? ' · Lefty' : ''}{surface ? ` · ${surface.charAt(0).toUpperCase() + surface.slice(1)}` : ''}
              </div>
              {similarMatches.length >= 2 && simWinRate != null && (
                <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginTop: 2 }}>
                  Similar UTR bracket: {simWinRate}% win rate ({simWins}W {similarMatches.length - simWins}L across {similarMatches.length} matches)
                </div>
              )}
            </div>
            {isKnown && knownWinRate != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: knownWinRate >= 50 ? G : R }}>{knownWinRate}%</div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', letterSpacing: 1 }}>WIN RATE VS THEM</div>
              </div>
            )}
          </div>

          {/* Known opponent stats breakdown */}
          {isKnown && (
            <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>Stats vs {oppName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { l: 'Record',      v: `${knownWins}W ${knownLosses}L` },
                  { l: '1st Srv Ad',  v: vsAvg(m => m.serve?.first?.pct_ad) != null ? `${vsAvg(m => m.serve?.first?.pct_ad)}%` : '—' },
                  { l: 'Return 1st',  v: vsAvg(m => m.return?.first?.pct_ad) != null ? `${vsAvg(m => m.return?.first?.pct_ad)}%` : '—' },
                  { l: 'Avg UE',      v: vsAvg(m => m.shot_stats?.ue) ?? '—' },
                  { l: 'FH CC',       v: vsAvg(m => m.forehand?.cc_in) != null ? `${vsAvg(m => m.forehand?.cc_in)}%` : '—' },
                ].map(({ l, v }, i) => (
                  <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: '#e8d5b0' }}>{v}</div>
                    <div style={{ fontSize: 8, color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontFamily: 'monospace' }}>{l}</div>
                  </div>
                ))}
              </div>
              {vsWins.length > 0 && vsLosses.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'In Wins', matches: vsWins, color: G },
                    { label: 'In Losses', matches: vsLosses, color: R },
                  ].map(({ label, matches: ms, color }) => (
                    <div key={label} style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, letterSpacing: 1, color, fontFamily: 'monospace', marginBottom: 6 }}>{label}</div>
                      {[
                        ['1st Srv', avg(ms.map(m => m.serve?.first?.pct_ad)), '%'],
                        ['UE', avg(ms.map(m => m.shot_stats?.ue)), ''],
                        ['FH CC', avg(ms.map(m => m.forehand?.cc_in)), '%'],
                      ].map(([l, v, u], i) => v != null && (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                          <span style={{ color: '#444' }}>{l}</span>
                          <span style={{ fontFamily: 'monospace', color }}>{v}{u}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any }}>
                {historyMatches.map((m: any, i: number) => (
                  <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 4, background: m.score?.winner === 'JD' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', color: m.score?.winner === 'JD' ? G : R, border: `1px solid ${m.score?.winner === 'JD' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                    {m.score?.winner === 'JD' ? 'W' : 'L'} · {fmtDate(m.date)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus cards */}
          {focusCards.map(c => <FocusCard key={c.n} {...c} />)}

          {/* Match plan */}
          <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginTop: 6 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#333', textTransform: 'uppercase', marginBottom: 14 }}>
              Match Plan — {oppName || 'Opponent'}{utrValid ? ` UTR ${utr.toFixed(1)}` : ''}
            </div>
            {buildPlan().map(({ l, v }, i, arr) => <PlanRow key={i} l={l} v={v} last={i === arr.length - 1} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState('last')
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [fixingMatch, setFixingMatch] = useState<any>(null)

  useEffect(() => {
    fetch('/api/matches')
      .then(r=>r.json())
      .then(d=>{ setMatches(d.matches||[]); setLoading(false) })
      .catch(()=>setLoading(false))
  }, [])

  const addMatch = useCallback((m: any) => {
    setMatches(prev => {
      const filtered = prev.filter(x=>x.id!==m.id)
      return [...filtered,m].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
    })
    setTab('last')
  }, [])

  const deleteMatch = useCallback(async (id: string) => {
    if (!confirm('Delete this match?')) return
    await fetch('/api/matches',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setMatches(prev=>prev.filter(m=>m.id!==id))
  }, [])

  const patchMatch = useCallback((m: any) => {
    setMatches(prev => {
      const filtered = prev.filter(x=>x.id!==m.id)
      return [...filtered,m].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
    })
    setFixingMatch(null)
  }, [])

  const sorted = [...matches].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
  const lastMatch = sorted[sorted.length-1]
  const wins = matches.filter(m=>m.score?.winner==='JD').length
  const losses = matches.length - wins

  const avgs = {
    s1_ad:avg(matches.map(m=>m.serve?.first?.pct_ad)),
    s1_deuce:avg(matches.map(m=>m.serve?.first?.pct_deuce)),
    s2_ad:avg(matches.map(m=>m.serve?.second?.pct_ad)),
    s2_deuce:avg(matches.map(m=>m.serve?.second?.pct_deuce)),
    spd_s1_ad:avg(matches.map(m=>m.serve?.first?.spd_ad)),
    spd_s1_deuce:avg(matches.map(m=>m.serve?.first?.spd_deuce)),
    spd_s2_ad:avg(matches.map(m=>m.serve?.second?.spd_ad)),
    spd_s2_deuce:avg(matches.map(m=>m.serve?.second?.spd_deuce)),
    ret1_ad:avg(matches.map(m=>m.return?.first?.pct_ad)),
    ret1_deuce:avg(matches.map(m=>m.return?.first?.pct_deuce)),
    ret2_ad:avg(matches.map(m=>m.return?.second?.pct_ad)),
    ret2_deuce:avg(matches.map(m=>m.return?.second?.pct_deuce)),
    spd_ret1:avg(matches.map(m=>m.return?.first?.spd??m.return?.first?.spd_ad)),
    spd_ret2:avg(matches.map(m=>m.return?.second?.spd??m.return?.second?.spd_ad)),
    fh_cc:avg(matches.map(m=>m.forehand?.cc_in)),
    fh_dtl:avg(matches.map(m=>m.forehand?.dtl_in)),
    bh_cc:avg(matches.map(m=>m.backhand?.cc_in)),
    bh_dtl:avg(matches.map(m=>m.backhand?.dtl_in)),
    spd_fh_cc:avg(matches.map(m=>m.forehand?.spd_cc)),
    spd_fh_dtl:avg(matches.map(m=>m.forehand?.spd_dtl)),
    spd_bh_cc:avg(matches.map(m=>m.backhand?.spd_cc)),
    spd_bh_dtl:avg(matches.map(m=>m.backhand?.spd_dtl)),
  }

  const NAV = [{id:'last',l:'Last Match'},{id:'history',l:'Match History'},{id:'focus',l:'Next Strategy'},{id:'evolution',l:'Evolution'},{id:'jd',l:'JD Stats'},{id:'upload',l:'+ Upload'}]

  if (loading) return (
    <div style={{background:'#0a0a0a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontFamily:'monospace',fontSize:13}}>
      Loading matches...
    </div>
  )

  return (
    <div style={{background:'#0a0a0a',minHeight:'100vh'}}>
      {/* NAV */}
      <div style={{background:'#0d0d0d',borderBottom:'1px solid #161616',position:'sticky',top:0,zIndex:100}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 16px',display:'flex',alignItems:'center',gap:0,overflowX:'auto'}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:'#e8d5b0',padding:'12px 0',marginRight:16,flexShrink:0}}>
            AGASSI <span style={{fontSize:11,color:'#2a2a2a',fontFamily:'monospace',marginLeft:4}}>JD</span>
          </div>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{padding:'12px 14px',border:'none',background:'none',
                color:tab===n.id?'#e8d5b0':'#444',fontSize:11,fontWeight:600,
                letterSpacing:1,textTransform:'uppercase',cursor:'pointer',
                borderBottom:`2px solid ${tab===n.id?'#c4a96a':'transparent'}`,
                whiteSpace:'nowrap',fontFamily:'inherit',transition:'all 0.15s',flexShrink:0}}>
              {n.l}
            </button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8,flexShrink:0,paddingLeft:16}}>
            <span style={{fontFamily:'monospace',fontSize:10,padding:'3px 9px',borderRadius:20,background:GD,color:G}}>{wins}W</span>
            <span style={{fontFamily:'monospace',fontSize:10,padding:'3px 9px',borderRadius:20,background:RD,color:R}}>{losses}L</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 16px 80px'}}>

        {/* LAST MATCH */}
        {tab==='last' && (lastMatch ? <ErrorBoundary><MatchDetail m={lastMatch} avgs={avgs}/></ErrorBoundary> : <div style={{color:'#333',fontFamily:'monospace',textAlign:'center',padding:60}}>No matches yet. Upload your first match →</div>)}

        {/* HISTORY */}
        {tab==='history' && (
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,color:'#e8d5b0',marginBottom:4}}>Match History</div>
            <div style={{fontSize:11,color:'#444',fontFamily:'monospace',marginBottom:20}}>{matches.length} matches · {sorted[0]&&fmtDate(sorted[0].date)} → {lastMatch&&fmtDate(lastMatch.date)}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
              {[{v:matches.length,l:'Matches',c:B},{v:wins,l:'Wins',c:G},{v:matches.length?Math.round(wins/matches.length*100)+'%':'—',l:'Win Rate',c:A}].map(({v,l,c},i)=>(
                <div key={i} style={{background:'#161616',border:'1px solid #1e1e1e',borderRadius:12,padding:14,textAlign:'center'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:'#333',textTransform:'uppercase',letterSpacing:1.2,fontFamily:'monospace',marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{position:'relative',paddingLeft:20}}>
              <div style={{position:'absolute',left:6,top:0,bottom:0,width:1,background:'#161616'}}/>
              {[...sorted].reverse().map(m=>{
                const isWin=m.score?.winner==='JD'
                const isExp=expanded===m.id
                const s=m.shot_stats||{}
                const s1a=m.serve?.first?Math.round((m.serve.first.pct_ad+m.serve.first.pct_deuce)/2):null
                return (
                  <div key={m.id} style={{position:'relative',marginBottom:10}}>
                    <div style={{position:'absolute',left:-20,top:16,width:12,height:12,borderRadius:'50%',border:`2px solid ${isWin?G:R}`,background:isWin?GD:RD,transition:'transform 0.15s',transform:isExp?'scale(1.4)':'scale(1)'}}/>
                    <div onClick={()=>setExpanded(isExp?null:m.id)}
                      style={{background:'#141414',border:`1px solid ${isExp?'#c4a96a':'#1a1a1a'}`,borderRadius:12,padding:14,cursor:'pointer',transition:'border-color 0.15s'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:isExp?14:0}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>JD vs {m.opponent?.name}{m.opponent?.utr?` · UTR ${m.opponent.utr}`:''}</div>
                          <div style={{fontSize:10,color:'#333',fontFamily:'monospace',marginTop:2}}>{fmtDate(m.date)} · {m.surface}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:isWin?G:R}}>{m.score?.sets}</span>
                          <span style={{fontFamily:'monospace',fontSize:10,padding:'2px 8px',borderRadius:4,background:isWin?GD:RD,color:isWin?G:R}}>{isWin?'WIN':'LOSS'}</span>
                          {getMissingFields(m).length > 0 && (
                            <span style={{fontFamily:'monospace',fontSize:9,color:A,background:'rgba(251,191,36,0.08)',padding:'2px 6px',borderRadius:3,border:'1px solid rgba(251,191,36,0.15)'}}>
                              {getMissingFields(m).length} missing
                            </span>
                          )}
                          <button onClick={e=>{e.stopPropagation();setFixingMatch(m)}}
                            style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',color:A,cursor:'pointer',fontSize:10,lineHeight:1,padding:'3px 7px',borderRadius:4,fontFamily:'monospace',letterSpacing:0.5}}>
                            Fix
                          </button>
                          <button onClick={e=>{e.stopPropagation();deleteMatch(m.id)}}
                            style={{background:'none',border:'none',color:'#252525',cursor:'pointer',fontSize:16,lineHeight:1,padding:'2px 4px',borderRadius:4,transition:'color 0.15s'}}
                            onMouseEnter={e=>(e.target as any).style.color=R} onMouseLeave={e=>(e.target as any).style.color='#252525'}>×</button>
                        </div>
                      </div>
                      {!isExp&&(
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginTop:10}}>
                          {[
                            {v:s1a!=null?s1a+'%':null,l:'1st Serve',c:col(s1a||0,75,60)},
                            {v:s.ue,l:'UE',c:s.ue==null?'#333':s.ue<30?G:s.ue<42?A:R},
                            {v:s.bp_won_pct!=null?s.bp_won_pct+'%':null,l:'BP Won',c:col(s.bp_won_pct||0,50,35)},
                          ].map(({v,l,c},i)=>(
                            <div key={i} style={{background:'#1a1a1a',borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                              <div style={{fontFamily:'monospace',fontSize:13,fontWeight:500,color:v?c:'#2a2a2a'}}>{v??'—'}</div>
                              <div style={{fontSize:8,color:'#2a2a2a',textTransform:'uppercase',letterSpacing:1,marginTop:1,fontFamily:'monospace'}}>{l}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isExp&&<div style={{borderTop:'1px solid #1a1a1a',paddingTop:16}}><ErrorBoundary><MatchDetail m={m} avgs={avgs}/></ErrorBoundary></div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FOCUS */}
        {tab==='focus' && <NextMatchStrategy matches={matches} avgs={avgs} />}

        {/* EVOLUTION */}
        {tab==='evolution' && (
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,color:'#e8d5b0',marginBottom:4}}>Evolution</div>
            <div style={{fontSize:11,color:'#444',fontFamily:'monospace',marginBottom:20}}>{matches.length} matches tracked</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div style={{background:'#141414',border:'1px solid #1a1a1a',borderRadius:12,padding:16}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:G,textTransform:'uppercase',fontFamily:'monospace',marginBottom:12}}>↑ Improving</div>
                {[
                  {n:'Unforced errors',d:`${sorted[0]?.shot_stats?.ue??'—'}→${lastMatch?.shot_stats?.ue??'—'} (trend ↓)`},
                  {n:'FH CC reliability',d:'43→89% range'},
                  {n:'Return depth',d:'Improving match to match'},
                  {n:'2nd serve %',d:'Consistently 75%+'},
                ].map(({n,d},i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i===3?'none':'1px solid #1a1a1a'}}>
                    <span style={{fontSize:12,color:'#777'}}>{n}</span>
                    <span style={{fontFamily:'monospace',fontSize:11,color:G}}>{d}</span>
                  </div>
                ))}
              </div>
              <div style={{background:'#141414',border:'1px solid #1a1a1a',borderRadius:12,padding:16}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:R,textTransform:'uppercase',fontFamily:'monospace',marginBottom:12}}>↓ Watch Out</div>
                {[
                  {n:'BH depth',d:'No consistent improvement'},
                  {n:'Winners count',d:`Avg: ${avg(matches.map(m=>m.shot_stats?.winners))??'—'}`},
                  {n:'Super TBs',d:'0–3 record'},
                  {n:'Ad 1st serve',d:`Avg ${avgs.s1_ad??'—'}%`},
                ].map(({n,d},i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i===3?'none':'1px solid #1a1a1a'}}>
                    <span style={{fontSize:12,color:'#777'}}>{n}</span>
                    <span style={{fontFamily:'monospace',fontSize:11,color:R}}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
            {[
              {title:'Unforced Errors',data:sorted.map(m=>m.shot_stats?.ue),color:R,note:'Lower is better'},
              {title:'Forehand CC %',data:sorted.map(m=>m.forehand?.cc_in),color:B,note:'Target 80%+'},
              {title:'1st Serve Ad %',data:sorted.map(m=>m.serve?.first?.pct_ad),color:A,note:'Target 70%+'},
              {title:'Return Depth Ad',data:sorted.map(m=>m.return?.first?.deep_ad),color:'#c084fc',note:'Target 55%+'},
              {title:'Winners',data:sorted.map(m=>m.shot_stats?.winners),color:G,note:'Higher is better'},
              {title:'BH CC Depth %',data:sorted.map(m=>m.backhand?.depth_cc),color:'#fb7185',note:'Target 55%+'},
            ].map(({title,data,color,note})=>(
              <div key={title} style={{background:'#141414',border:'1px solid #1a1a1a',borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontSize:11,fontFamily:'monospace',letterSpacing:1,color:'#444',textTransform:'uppercase'}}>{title}</div>
                  <div style={{fontSize:10,color:'#252525',fontFamily:'monospace'}}>{note}</div>
                </div>
                <MiniChart data={data} color={color} labels={sorted.map(m=>m.date)} />
                <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                  {sorted.map((m,i)=>(
                    <div key={i} style={{fontSize:8,color:'#252525',fontFamily:'monospace',textAlign:'center',flex:1}}>
                      {new Date(m.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{background:'#141414',border:'1px solid #c4a96a',borderRadius:14,padding:20,marginTop:6}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:'#e8d5b0',marginBottom:6}}>UTR Trajectory</div>
              <div style={{fontSize:12,color:'#555',lineHeight:1.6,marginBottom:16}}>Based on results and opponent levels across {matches.length} tracked matches.</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[{v:'~3.1',l:'Est. Current',sub:'Based on results',c:'#e8d5b0'},{v:'3.5',l:'Near-term',sub:'Fix BH depth',c:A},{v:'4.0',l:'6-month',sub:'If TB rate improves',c:G}].map(({v,l,sub,c},i)=>(
                  <div key={i} style={{background:'#1a1a1a',borderRadius:10,padding:14,textAlign:'center'}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:c}}>{v}</div>
                    <div style={{fontSize:9,color:'#333',textTransform:'uppercase',letterSpacing:1.2,fontFamily:'monospace',marginTop:3}}>{l}</div>
                    <div style={{fontSize:10,color:'#2a2a2a',marginTop:3}}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* JD STATS */}
        {tab==='jd' && <JDStats matches={matches} avgs={avgs}/>}

        {/* UPLOAD */}
        {tab==='upload' && <UploadMatch onMatchAdded={addMatch} matches={matches}/>}
      </div>

      {/* FIX MATCH MODAL — full-screen overlay */}
      {fixingMatch && (
        <FixMatchModal
          match={fixingMatch}
          onPatched={patchMatch}
          onClose={() => setFixingMatch(null)}
        />
      )}
    </div>
  )
}
