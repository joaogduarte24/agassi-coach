'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ATP_PLAYERS, ATPPlayer } from '@/lib/atp-players'

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
          {(m.score?.sets_arr||[]).map(([j,o]: number[], i: number) => (
            <span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,padding:'3px 12px',borderRadius:6,background:j>o?GD:RD,color:j>o?G:R}}>{j}–{o}</span>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:14}}>
        {[
          {v:s.winners,l:'Winners'},{v:s.ue,l:'UE',inv:true},{v:s.df,l:'DFs',inv:true,lo:true},
          {v:s.bp_saved_pct,l:'BP Saved',pct:true},{v:s.bp_won_pct,l:'BP Won',pct:true}
        ].map(({v,l,inv,lo,pct}:any,i:number)=>(
          <div key={i} style={{background:'#1e1e1e',borderRadius:8,padding:'10px 6px',textAlign:'center'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,
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

      {(m.what_worked||m.what_didnt||m.key_number) && (
        <div style={{background:'#0e0e0e',border:'1px solid #1e1e1e',borderRadius:12,padding:20}}>
          <div style={{fontFamily:'monospace',fontSize:11,letterSpacing:2,color:A,marginBottom:14}}>🎙 COACH'S READ</div>
          {m.what_worked&&<><div style={{fontSize:10,letterSpacing:1.5,color:'#444',textTransform:'uppercase',fontFamily:'monospace',marginBottom:6}}>What Worked</div>
          <ul style={{listStyle:'none',padding:0,marginBottom:10}}>{m.what_worked.map((x:string,i:number)=><li key={i} style={{paddingLeft:14,position:'relative',fontSize:13,color:'#bbb',lineHeight:1.6,paddingBottom:3}}><span style={{position:'absolute',left:0,color:'#333'}}>—</span>{x}</li>)}</ul></>}
          {m.what_didnt&&<><div style={{fontSize:10,letterSpacing:1.5,color:'#444',textTransform:'uppercase',fontFamily:'monospace',marginBottom:6,marginTop:10}}>What Didn't</div>
          <ul style={{listStyle:'none',padding:0,marginBottom:10}}>{m.what_didnt.map((x:string,i:number)=><li key={i} style={{paddingLeft:14,position:'relative',fontSize:13,color:'#bbb',lineHeight:1.6,paddingBottom:3}}><span style={{position:'absolute',left:0,color:'#333'}}>—</span>{x}</li>)}</ul></>}
          {m.key_number&&<div style={{background:'rgba(248,113,113,0.08)',borderLeft:'3px solid #f87171',padding:'10px 14px',borderRadius:'0 8px 8px 0',color:R,fontSize:13,lineHeight:1.6}}>{m.key_number}</div>}
        </div>
      )}
    </div>
  )
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────
function UploadMatch({ onMatchAdded }: { onMatchAdded: (m: any) => void }) {
  const [images, setImages] = useState<any[]>([])
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')
  const [surface, setSurface] = useState('Clay')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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

  const processMatch = async () => {
    if (!images.length) { setStatus('⚠️ Upload at least one screenshot'); return }
    setLoading(true)
    setStatus('🔍 Analysing screenshots...')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, oppName, oppUtr, surface })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed')

      setStatus('💾 Saving match...')
      const saveRes = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: data.match })
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error || 'Save failed')

      onMatchAdded(data.match)
      setImages([])
      setOppName('')
      setOppUtr('')
      setStatus('✅ Match saved!')
      setTimeout(() => setStatus(''), 3000)
    } catch(e: any) {
      setStatus('❌ ' + e.message)
    }
    setLoading(false)
  }

  const inp = (style: any) => ({...style, background:'#161616',border:'1px solid #252525',borderRadius:8,padding:'9px 12px',color:'#f0f0f0',fontSize:13,outline:'none',fontFamily:'inherit',width:'100%'})

  return (
    <div style={{maxWidth:520,margin:'0 auto'}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,color:'#e8d5b0',marginBottom:6}}>Upload New Match</div>
      <div style={{fontSize:12,color:'#555',fontFamily:'monospace',marginBottom:24}}>Drop 1–2 SwingVision screenshots (Match Stats + Shot Stats tabs)</div>

      <div onClick={()=>fileRef.current?.click()}
        style={{border:`2px dashed ${images.length?'rgba(74,222,128,0.4)':'#252525'}`,borderRadius:12,padding:'28px 20px',textAlign:'center',cursor:'pointer',marginBottom:16,background:images.length?'rgba(74,222,128,0.03)':'transparent',transition:'all 0.2s'}}>
        <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{display:'none'}} />
        {images.length ? (
          <div>
            <div style={{fontSize:26,marginBottom:8}}>📸</div>
            <div style={{color:G,fontSize:13}}>{images.length} image{images.length>1?'s':''} ready</div>
            <div style={{fontSize:11,color:'#444',marginTop:4}}>{images.map(i=>i.name).join(', ')}</div>
            <button onClick={e=>{e.stopPropagation();setImages([])}} style={{marginTop:8,background:'none',border:'none',color:'#555',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>clear</button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:32,marginBottom:8,opacity:0.3}}>↑</div>
            <div style={{color:'#555',fontSize:13}}>Tap to select screenshots</div>
            <div style={{fontSize:11,color:'#333',marginTop:4}}>JPEG or PNG · Match Stats + Shot Stats</div>
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
        <div>
          <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:5}}>OPPONENT</div>
          <input value={oppName} onChange={e=>setOppName(e.target.value)} placeholder="e.g. Gonçalo" style={inp({})} />
        </div>
        <div>
          <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:5}}>UTR (OPTIONAL)</div>
          <input value={oppUtr} onChange={e=>setOppUtr(e.target.value)} placeholder="e.g. 3.75" style={inp({})} />
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,color:'#444',fontFamily:'monospace',letterSpacing:1,marginBottom:8}}>SURFACE</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
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

      {status && (
        <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:'#111',border:'1px solid #1e1e1e',fontSize:13,color:'#aaa',textAlign:'center'}}>
          {status}
        </div>
      )}
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
function NextMatchStrategy({ matches, avgs }: { matches: any[]; avgs: any }) {
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')

  const utr = parseFloat(oppUtr)
  const utrValid = !isNaN(utr) && utr > 0

  // Fuzzy match against match history by name
  const historyMatches = oppName.trim().length >= 2
    ? matches.filter(m => m.opponent?.name?.toLowerCase().includes(oppName.trim().toLowerCase()))
    : []
  const isKnown = historyMatches.length > 0
  const knownWins = historyMatches.filter(m => m.score?.winner === 'JD').length
  const knownLosses = historyMatches.length - knownWins

  // JD's persistent weak spots (always relevant)
  const myWeakSpots = [
    avgs.s1_ad != null && avgs.s1_ad < 68 ? `1st serve Ad (${avgs.s1_ad}% avg, target 70%+)` : null,
    avgs.bh_dtl != null && avgs.bh_dtl < 72 ? `BH DTL (${avgs.bh_dtl}% avg — tend to go mid-court)` : null,
    avg(matches.map(m => m.shot_stats?.df)) != null && (avg(matches.map(m => m.shot_stats?.df)) ?? 0) > 4 ? `Double faults (avg ${avg(matches.map(m => m.shot_stats?.df))} per match)` : null,
  ].filter(Boolean) as string[]

  // UTR-bracket strategy matrix
  type BracketStrategy = { bracket: string; threat: string; serve: string; return: string; pattern: string; mindset: string; watchOut: string }
  const getUtrStrategy = (u: number): BracketStrategy => {
    if (u < 2.5) return {
      bracket: 'Below 2.5 UTR — Consistency wins',
      threat: 'Low power, high UE rate. They will hand you points — take them.',
      serve: 'High %: flat wide Deuce, body Ad. First serve percentage > pace.',
      return: 'Attack every 2nd serve. Step inside the baseline and drive.',
      pattern: 'Deep CC rally → first short ball → inside-out FH winner.',
      mindset: 'Don\'t tighten up. Play loose, high-margin tennis. Win 6-2 6-2.',
      watchOut: 'Junk ball — floaty slices and moonballs. Stay patient, reset with depth.',
    }
    if (u < 3.0) return {
      bracket: '2.5–3.0 UTR — Your level, no margin for error',
      threat: 'Comparable consistency. Rallies will be long. Errors decide the match.',
      serve: 'Lead with 1st serve Ad (commit to body/T pre-toss). 68%+ keeps you in.',
      return: 'Deep CC to BH. Neutralise — don\'t go for too much.',
      pattern: 'Out-rally with depth. BH CC deep → wait for FH → attack DTL.',
      mindset: 'Compete for every point. Tiebreaks: trust your process, go for it.',
      watchOut: 'UE spikes under pressure. Breathe, reset between points.',
    }
    if (u < 3.5) return {
      bracket: '3.0–3.5 UTR — Competitive, winnable with clean execution',
      threat: 'More consistent baseline game, stronger serve, better court position.',
      serve: '1st serve % is critical. Target Ad side body or T — avoid predictable patterns.',
      return: 'Chip/block back deep on fast 1st serves. Attack 2nd serve early.',
      pattern: 'Get to neutral → build with BH depth → attack when FH is on.',
      mindset: 'Super TBs — go aggressive from 5+. Don\'t play not to lose.',
      watchOut: 'Getting drawn into their pace. Reset with a high looping ball if pushed wide.',
    }
    if (u < 4.5) return {
      bracket: '3.5–4.5 UTR — Strong player, tactical match',
      threat: 'Fast serve, consistent deep balls, will punish anything mid-court.',
      serve: 'Variety is key: wide + body combo. Mix speeds. 2nd serve kick to BH.',
      return: 'Block deep, don\'t try to blast it. Look for a short 2nd serve to attack.',
      pattern: 'Serve + 1: force weak return, step in early. Limit rally length.',
      mindset: 'Accept that you\'ll be on defence more. Win the short-point battle.',
      watchOut: 'Trying to match their pace from the back. Play smarter, not harder.',
    }
    return {
      bracket: '4.5+ UTR — Elite level, defensive game plan',
      threat: 'High-quality serve, heavy topspin, exceptional positioning. Will dominate long rallies.',
      serve: 'Big body serve on Ad to limit their FH attack. Use wide Deuce to open court.',
      return: 'Ultra-conservative: land it in and stay in the point. 1 in = 1 free point.',
      pattern: 'High defensive margin. Slice BH to buy time. Attack only clear short balls.',
      mindset: 'Every game won is a success. Compete until the last ball.',
      watchOut: 'Trying to play like them. Accept their level, frustrate with consistency.',
    }
  }

  const strat = utrValid ? getUtrStrategy(utr) : null

  // Known opponent specific patterns
  const knownAvg = (fn: (m: any) => any) => avg(historyMatches.map(fn))
  const knownWinRate = historyMatches.length ? Math.round((knownWins / historyMatches.length) * 100) : null

  const inp = (extra: any = {}) => ({
    background: '#161616', border: '1px solid #252525', borderRadius: 8,
    padding: '10px 14px', color: '#e8d5b0', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, ...extra
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

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, letterSpacing: 3, color: '#e8d5b0' }}>Next Match Strategy</div>
        <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 4 }}>
          {matches.length > 0 ? `Based on ${matches.length} matches · updated after every session` : 'Add your first match to get personalised strategy'}
        </div>
      </div>

      {/* Opponent Inputs */}
      <div style={{ background: '#141414', border: '1px solid #252525', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 16 }}>Next Opponent</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>NAME <span style={{ color: '#2a2a2a' }}>optional</span></div>
            <input
              value={oppName}
              onChange={e => setOppName(e.target.value)}
              placeholder="e.g. Gonçalo"
              style={inp()}
            />
            {isKnown && (
              <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'monospace', color: G }}>
                ✓ {historyMatches.length} match{historyMatches.length > 1 ? 'es' : ''} on record · {knownWins}W {knownLosses}L
              </div>
            )}
            {oppName.trim().length >= 2 && !isKnown && (
              <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'monospace', color: '#333' }}>No history found — UTR-based plan will apply</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>
              UTR LEVEL <span style={{ color: '#fbbf24', marginLeft: 4 }}>required</span>
            </div>
            <input
              value={oppUtr}
              onChange={e => setOppUtr(e.target.value)}
              placeholder="e.g. 3.2"
              type="number"
              step="0.1"
              min="0"
              max="16"
              style={inp({ borderColor: oppUtr && !utrValid ? '#f87171' : '#252525' })}
            />
            {utrValid && (
              <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'monospace', color: '#555' }}>
                {utr < 2.5 ? 'Below your level' : utr < 3.3 ? 'Your level (~3.1 est.)' : utr < 4.5 ? 'Above your level' : 'Well above — tough match'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* No UTR entered — show placeholder */}
      {!utrValid && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#2a2a2a', fontFamily: 'monospace', fontSize: 12 }}>
          Enter opponent UTR above to generate your match strategy ↑
        </div>
      )}

      {/* Strategy content */}
      {utrValid && strat && (
        <>
          {/* Bracket banner */}
          <div style={{ background: '#141414', border: '1px solid #252525', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#444', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>Matchup</div>
              <div style={{ fontSize: 14, color: '#e8d5b0', fontWeight: 600 }}>
                {oppName.trim() || 'Opponent'} · UTR {utr.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginTop: 2 }}>{strat.bracket}</div>
            </div>
            {isKnown && knownWinRate != null && (
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: knownWinRate >= 50 ? G : R }}>{knownWinRate}%</div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', letterSpacing: 1 }}>WIN RATE VS THEM</div>
              </div>
            )}
          </div>

          {/* Known opponent — history breakdown */}
          {isKnown && (
            <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>History vs {oppName.trim()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { l: 'Matches', v: historyMatches.length },
                  { l: 'Record', v: `${knownWins}W ${knownLosses}L` },
                  { l: 'Avg 1st Srv %', v: knownAvg(m => m.serve?.first?.pct_ad) != null ? `${knownAvg(m => m.serve?.first?.pct_ad)}%` : '—' },
                  { l: 'Avg UE', v: knownAvg(m => m.shot_stats?.ue) ?? '—' },
                ].map(({ l, v }, i) => (
                  <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: '#e8d5b0' }}>{v}</div>
                    <div style={{ fontSize: 8, color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontFamily: 'monospace' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', lineHeight: 1.7 }}>
                {historyMatches.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < historyMatches.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <span style={{ color: '#333' }}>{fmtDate(m.date)}</span>
                    <span style={{ color: m.score?.winner === 'JD' ? G : R }}>{m.score?.winner === 'JD' ? 'W' : 'L'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key focus cards */}
          <FocusCard
            n="01"
            title={`Threat: ${strat.threat.split('.')[0]}`}
            stat={strat.bracket}
            body={strat.threat}
            action={`MINDSET: ${strat.mindset}`}
          />
          <FocusCard
            n="02"
            title="Serve strategy"
            stat={`UTR ${utr.toFixed(1)} → ${utr < 3.0 ? 'high % priority' : 'variety + aggression'}`}
            body={strat.serve}
            action={avgs.s1_ad != null && avgs.s1_ad < 68 ? `YOUR AD SERVE IS ${avgs.s1_ad}% AVG — COMMIT EARLY, PICK TARGET PRE-TOSS` : 'LEAD WITH THE SERVE — IT SETS UP EVERYTHING'}
          />
          <FocusCard
            n="03"
            title="Return game"
            stat={`1st return avg: ${avgs.ret1_ad ?? '—'}% · 2nd return avg: ${avgs.ret2_ad ?? '—'}%`}
            body={strat.return}
            action="DEEP CC RETURN → STEP IN ON BALL 3"
          />
          <FocusCard
            n="04"
            title="Tactical pattern"
            stat={`FH CC: ${avgs.fh_cc ?? '—'}% · BH CC: ${avgs.bh_cc ?? '—'}%`}
            body={strat.pattern}
            action={`WATCH OUT: ${strat.watchOut}`}
          />

          {/* JD weak spots (always relevant) */}
          {myWeakSpots.length > 0 && (
            <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: R, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>Your Persistent Gaps — Don't Let Them Exploit These</div>
              {myWeakSpots.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: i < myWeakSpots.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <span style={{ color: R, fontSize: 10, marginTop: 1 }}>▲</span>
                  <span style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Match Plan */}
          <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginTop: 6 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#333', textTransform: 'uppercase', marginBottom: 14 }}>
              Match Plan — {oppName.trim() || 'Opponent'} UTR {utr.toFixed(1)}
            </div>
            <PlanRow l="1st serve Ad" v={strat.serve.split('.')[0]} />
            <PlanRow l="2nd serve" v={avgs.spd_s2_ad ? `Kick to body (~${avgs.spd_s2_ad} km/h avg). Don't overthink.` : 'Kick to body. Consistently strong.'} />
            <PlanRow l="Return" v={strat.return.split('.')[0]} />
            <PlanRow l="Pattern" v={strat.pattern} />
            <PlanRow l="Mindset" v={strat.mindset} last />
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
        {tab==='last' && (lastMatch ? <MatchDetail m={lastMatch} avgs={avgs}/> : <div style={{color:'#333',fontFamily:'monospace',textAlign:'center',padding:60}}>No matches yet. Upload your first match →</div>)}

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
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:isWin?G:R}}>{m.score?.sets}</span>
                          <span style={{fontFamily:'monospace',fontSize:10,padding:'2px 8px',borderRadius:4,background:isWin?GD:RD,color:isWin?G:R}}>{isWin?'WIN':'LOSS'}</span>
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
                      {isExp&&<div style={{borderTop:'1px solid #1a1a1a',paddingTop:16}}><MatchDetail m={m} avgs={avgs}/></div>}
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
        {tab==='upload' && <UploadMatch onMatchAdded={addMatch}/>}
      </div>
    </div>
  )
}
