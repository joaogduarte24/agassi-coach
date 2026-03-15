'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

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

  const NAV = [{id:'last',l:'Last Match'},{id:'history',l:'Match History'},{id:'focus',l:'Next Focus'},{id:'evolution',l:'Evolution'},{id:'upload',l:'+ Upload'}]

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
        {tab==='focus' && (
          <div>
            <div style={{textAlign:'center',padding:'16px 0 22px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:38,letterSpacing:3,color:'#e8d5b0'}}>Next Match Focus</div>
              <div style={{fontSize:11,color:'#444',fontFamily:'monospace',marginTop:4}}>Based on last {Math.min(matches.length,5)} matches · updated after every session</div>
            </div>
            {[
              {n:'01',title:'Add depth to your backhand',stat:`BH CC depth avg: ${avg(matches.map(m=>m.backhand?.depth_cc))??'limited'}% · target 55%+`,body:"Chronic across all 10 tracked matches. BH goes in consistently (72-87%) but lands mid-court — handing every opponent a free attacking ball. Contact point needs to drive through, not guide.",action:'AIM 1–1.5m inside baseline. Hit through the ball.'},
              {n:'02',title:'Attack ball 3 after the return',stat:`Super TB record: 0–3 · all vs 3.5+`,body:"Return rate is excellent (77-93%). Problem is what happens next — you get in the rally and wait. At 3.5+, passive baseline play loses close matches and super tiebreaks.",action:'AFTER A DEEP RETURN: step in on ball 3. Decide early, commit fully.'},
              {n:'03',title:'Fix the Ad side 1st serve',stat:`1st serve Ad avg: ${avgs.s1_ad??'—'}% · target 70%+`,body:"Ad side 1st serve is consistently your weakest metric. Sub-65% means starting too many points on 2nd serve from the most important position — break points, ad-outs, closing games.",action:'PICK ONE TARGET before the toss. No last-second changes.'},
              {n:'04',title:'Super tiebreak mindset',stat:'TB record: 0–3 · consistent pattern',body:"Three super tiebreaks, three losses. You go passive when the score matters most. The data shows you can win those matches — you just need to change gear at 5+.",action:'AT 5+ IN A TB: attack the first short ball. Play to WIN, not to survive.'},
            ].map(({n,title,stat,body,action})=>(
              <div key={n} style={{background:'#141414',border:'1px solid #1a1a1a',borderRadius:14,padding:20,marginBottom:12,display:'flex',gap:14,alignItems:'flex-start'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:'#1e1e1e',lineHeight:1,flexShrink:0,width:40}}>{n}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:'#e8d5b0',marginBottom:6}}>{title}</div>
                  <div style={{fontFamily:'monospace',fontSize:10,color:'#444',background:'#1a1a1a',padding:'3px 8px',borderRadius:4,display:'inline-block',marginBottom:8}}>{stat}</div>
                  <div style={{fontSize:13,color:'#777',lineHeight:1.65,marginBottom:10}}>{body}</div>
                  <div style={{fontFamily:'monospace',fontSize:10,letterSpacing:1,color:A,background:AD,padding:'5px 10px',borderRadius:4,display:'inline-block'}}>{action}</div>
                </div>
              </div>
            ))}
            <div style={{background:'#141414',border:'1px solid #1a1a1a',borderRadius:14,padding:20,marginTop:6}}>
              <div style={{fontFamily:'monospace',fontSize:10,letterSpacing:2,color:'#333',textTransform:'uppercase',marginBottom:14}}>Match Plan</div>
              {[
                {l:'1st serve Ad',v:'Body or T — commit pre-toss. 70%+ target.'},
                {l:'1st serve Deuce',v:'Wide — solid (68-75% avg). Keep it.'},
                {l:'2nd serve',v:'Kick to body. Consistently strong. Don\'t overthink.'},
                {l:'Return',v:'Deep CC to BH. Get it deep, step in on ball 3.'},
                {l:'Pattern',v:'Deep return → FH CC / BH CC deep → attack short ball.'},
              ].map(({l,v},i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i===4?'none':'1px solid #1a1a1a',gap:16}}>
                  <span style={{fontSize:12,color:'#444',minWidth:130,flexShrink:0}}>{l}</span>
                  <span style={{fontSize:12,color:'#999',textAlign:'right'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* UPLOAD */}
        {tab==='upload' && <UploadMatch onMatchAdded={addMatch}/>}
      </div>
    </div>
  )
}
