'use client'
import { useState, useEffect, useCallback } from 'react'
import { G, R, GD, RD, avg, fmtDate, col, getMissingFields, ErrorBoundary } from '@/app/lib/helpers'
import { Avgs } from '@/app/types'
import MatchDetail from '@/app/components/MatchDetail'
import UploadMatch from '@/app/components/UploadMatch'
import FixMatchModal from '@/app/components/FixMatchModal'
import JDStats from '@/app/components/JDStats'
import NextMatchStrategy from '@/app/components/Strategy'

// ─── MINI CHART (used only in Evolution tab) ─────────────────────────────────
function MiniChart({ data, color }: any) {
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

  const avgs: Avgs = {
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
        {tab==='last' && (lastMatch
          ? <ErrorBoundary><MatchDetail m={lastMatch} avgs={avgs}/></ErrorBoundary>
          : <div style={{color:'#333',fontFamily:'monospace',textAlign:'center',padding:60}}>No matches yet. Upload your first match →</div>
        )}

        {/* HISTORY */}
        {tab==='history' && (
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,color:'#e8d5b0',marginBottom:4}}>Match History</div>
            <div style={{fontSize:11,color:'#444',fontFamily:'monospace',marginBottom:20}}>{matches.length} matches · {sorted[0]&&fmtDate(sorted[0].date)} → {lastMatch&&fmtDate(lastMatch.date)}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
              {[{v:matches.length,l:'Matches',c:'#60a5fa'},{v:wins,l:'Wins',c:G},{v:matches.length?Math.round(wins/matches.length*100)+'%':'—',l:'Win Rate',c:'#fbbf24'}].map(({v,l,c},i)=>(
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
                            <span style={{fontFamily:'monospace',fontSize:9,color:'#fbbf24',background:'rgba(251,191,36,0.08)',padding:'2px 6px',borderRadius:3,border:'1px solid rgba(251,191,36,0.15)'}}>
                              {getMissingFields(m).length} missing
                            </span>
                          )}
                          <button onClick={e=>{e.stopPropagation();setFixingMatch(m)}}
                            style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24',cursor:'pointer',fontSize:10,lineHeight:1,padding:'3px 7px',borderRadius:4,fontFamily:'monospace',letterSpacing:0.5}}>
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
                            {v:s.ue,l:'UE',c:s.ue==null?'#333':s.ue<30?G:s.ue<42?'#fbbf24':R},
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
              {title:'Forehand CC %',data:sorted.map(m=>m.forehand?.cc_in),color:'#60a5fa',note:'Target 80%+'},
              {title:'1st Serve Ad %',data:sorted.map(m=>m.serve?.first?.pct_ad),color:'#fbbf24',note:'Target 70%+'},
              {title:'Return Depth Ad',data:sorted.map(m=>m.return?.first?.deep_ad),color:'#c084fc',note:'Target 55%+'},
              {title:'Winners',data:sorted.map(m=>m.shot_stats?.winners),color:G,note:'Higher is better'},
              {title:'BH CC Depth %',data:sorted.map(m=>m.backhand?.depth_cc),color:'#fb7185',note:'Target 55%+'},
            ].map(({title,data,color,note})=>(
              <div key={title} style={{background:'#141414',border:'1px solid #1a1a1a',borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontSize:11,fontFamily:'monospace',letterSpacing:1,color:'#444',textTransform:'uppercase'}}>{title}</div>
                  <div style={{fontSize:10,color:'#252525',fontFamily:'monospace'}}>{note}</div>
                </div>
                <MiniChart data={data} color={color} />
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
                {[{v:'~3.1',l:'Est. Current',sub:'Based on results',c:'#e8d5b0'},{v:'3.5',l:'Near-term',sub:'Fix BH depth',c:'#fbbf24'},{v:'4.0',l:'6-month',sub:'If TB rate improves',c:G}].map(({v,l,sub,c},i)=>(
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

      {/* FIX MATCH MODAL */}
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
