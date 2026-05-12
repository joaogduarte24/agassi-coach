'use client'
import { G, A, R, GD, RD, col, fmtDate, FONT_DATA } from '@/app/lib/helpers'
import { Match, Avgs } from '@/app/types'
import StatBar from './StatBar'
import Card from './ui/Card'

interface MatchDetailProps {
  m: Match
  avgs: Avgs
}

export default function MatchDetail({ m, avgs }: MatchDetailProps) {
  const isWin = m.score?.winner === 'JD'
  const s = m.shot_stats || {} as any
  const utrStr = m.opponent?.utr ? ` · UTR ${m.opponent.utr}` : ''

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
            <div style={{fontSize:11,color:'#666',marginTop:4,fontFamily: FONT_DATA}}>
              {fmtDate(m.date)} · {m.surface} · {m.score?.sets}
            </div>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2,padding:'5px 12px',borderRadius:6,background:isWin?GD:RD,color:isWin?G:R,border:`1px solid ${isWin?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}`}}>
            {isWin?'WIN':'LOSS'}
          </span>
        </div>
        <div style={{display:'flex',gap:8}}>
          {(Array.isArray(m.score?.sets_arr) ? m.score.sets_arr : Object.values(m.score?.sets_arr || {})).map((set: any, i: number) => {
            // Handle both [7,5] arrays and {"0":7,"1":5} plain objects from deepMerge
            const j = Array.isArray(set) ? set[0] : (set?.['0'] ?? Object.values(set||{})[0])
            const o = Array.isArray(set) ? set[1] : (set?.['1'] ?? Object.values(set||{})[1])
            return <span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,padding:'3px 12px',borderRadius:6,background:j>o?GD:RD,color:j>o?G:R}}>{j}–{o}</span>
          })}
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
            <div style={{fontSize:9,color:'#444',textTransform:'uppercase',letterSpacing:1.2,marginTop:3,fontFamily: FONT_DATA}}>{l}</div>
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
            <div style={{fontSize:9,color:'#444',textTransform:'uppercase',letterSpacing:1.2,marginTop:3,fontFamily: FONT_DATA}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'#444',padding:'7px 12px',background:'#141414',borderRadius:6,marginBottom:14}}>
        <div style={{width:16,height:1.5,background:'rgba(255,255,255,0.45)'}}/>
        <span>White line = your average across all matches</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <Card variant="inset" title="1st Serve">
          <StatBar label="Ad %" val={m.serve?.first?.pct_ad??null} avgVal={avgs.s1_ad} gThresh={75} aThresh={60} />
          <StatBar label="Ad Speed" val={m.serve?.first?.spd_ad??null} avgVal={avgs.spd_s1_ad} gThresh={88} aThresh={78} suffix="km/h" />
          <StatBar label="Deuce %" val={m.serve?.first?.pct_deuce??null} avgVal={avgs.s1_deuce} gThresh={75} aThresh={60} />
          <StatBar label="Deuce Speed" val={m.serve?.first?.spd_deuce??null} avgVal={avgs.spd_s1_deuce} gThresh={88} aThresh={78} suffix="km/h" />
        </Card>
        <Card variant="inset" title="2nd Serve">
          <StatBar label="Ad %" val={m.serve?.second?.pct_ad??null} avgVal={avgs.s2_ad} gThresh={80} aThresh={65} />
          <StatBar label="Ad Speed" val={m.serve?.second?.spd_ad??null} avgVal={avgs.spd_s2_ad} gThresh={75} aThresh={65} suffix="km/h" />
          <StatBar label="Deuce %" val={m.serve?.second?.pct_deuce??null} avgVal={avgs.s2_deuce} gThresh={80} aThresh={65} />
          <StatBar label="Deuce Speed" val={m.serve?.second?.spd_deuce??null} avgVal={avgs.spd_s2_deuce} gThresh={75} aThresh={65} suffix="km/h" />
        </Card>
        <Card variant="inset" title="1st Return">
          <StatBar label="Ad %" val={m.return?.first?.pct_ad??null} avgVal={avgs.ret1_ad} gThresh={80} aThresh={65} />
          <StatBar label="Ad Speed" val={(m.return?.first?.spd_ad??null)} avgVal={avgs.spd_ret1} gThresh={72} aThresh={62} suffix="km/h" />
          <StatBar label="Deuce %" val={m.return?.first?.pct_deuce??null} avgVal={avgs.ret1_deuce} gThresh={80} aThresh={65} />
          <StatBar label="Deuce Speed" val={m.return?.first?.spd_deuce??null} avgVal={avgs.spd_ret1} gThresh={72} aThresh={62} suffix="km/h" />
          <DepthRow cc={m.return?.first?.deep_ad} dtl={m.return?.first?.deep_deuce} />
        </Card>
        <Card variant="inset" title="2nd Return">
          <StatBar label="Ad %" val={m.return?.second?.pct_ad??null} avgVal={avgs.ret2_ad} gThresh={80} aThresh={65} />
          <StatBar label="Ad Speed" val={(m.return?.second?.spd_ad??null)} avgVal={avgs.spd_ret2} gThresh={72} aThresh={62} suffix="km/h" />
          <StatBar label="Deuce %" val={m.return?.second?.pct_deuce??null} avgVal={avgs.ret2_deuce} gThresh={80} aThresh={65} />
          <StatBar label="Deuce Speed" val={m.return?.second?.spd_deuce??null} avgVal={avgs.spd_ret2} gThresh={72} aThresh={62} suffix="km/h" />
          <DepthRow cc={m.return?.second?.deep_ad} dtl={m.return?.second?.deep_deuce} />
        </Card>
        <Card variant="inset" title="Forehand">
          <StatBar label="CC In %" val={m.forehand?.cc_in??null} avgVal={avgs.fh_cc} gThresh={80} aThresh={65} />
          <StatBar label="CC Speed" val={m.forehand?.spd_cc??null} avgVal={avgs.spd_fh_cc} gThresh={74} aThresh={65} suffix="km/h" />
          <StatBar label="DTL In %" val={m.forehand?.dtl_in??null} avgVal={avgs.fh_dtl} gThresh={80} aThresh={65} />
          <StatBar label="DTL Speed" val={m.forehand?.spd_dtl??null} avgVal={avgs.spd_fh_dtl} gThresh={74} aThresh={65} suffix="km/h" />
          <DepthRow cc={m.forehand?.depth_cc} dtl={m.forehand?.depth_dtl} />
        </Card>
        <Card variant="inset" title="Backhand">
          <StatBar label="CC In %" val={m.backhand?.cc_in??null} avgVal={avgs.bh_cc} gThresh={80} aThresh={65} />
          <StatBar label="CC Speed" val={m.backhand?.spd_cc??null} avgVal={avgs.spd_bh_cc} gThresh={68} aThresh={60} suffix="km/h" />
          <StatBar label="DTL In %" val={m.backhand?.dtl_in??null} avgVal={avgs.bh_dtl} gThresh={80} aThresh={65} />
          <StatBar label="DTL Speed" val={m.backhand?.spd_dtl??null} avgVal={avgs.spd_bh_dtl} gThresh={68} aThresh={60} suffix="km/h" />
          <DepthRow cc={m.backhand?.depth_cc} dtl={m.backhand?.depth_dtl} />
        </Card>
      </div>

      {/* Opponent Scout */}
      {m.opp_shots && (
        <div style={{background:'#1a1a1a',border:'1px solid #222',borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{fontSize:10,letterSpacing:2,color:'#555',textTransform:'uppercase',fontFamily: FONT_DATA,marginBottom:12}}>
            {m.opponent?.name} — Shot Tendencies
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {/* Opponent serve */}
            <div>
              <div style={{fontSize:9,color:'#333',fontFamily: FONT_DATA,letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Their Serve</div>
              {m.opp_shots.serve?.first?.pct_ad != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>1st Ad</span><span style={{fontFamily: FONT_DATA,color:m.opp_shots.serve.first.pct_ad>=65?R:A}}>{m.opp_shots.serve.first.pct_ad}%</span></div>}
              {m.opp_shots.serve?.first?.pct_deuce != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>1st Deuce</span><span style={{fontFamily: FONT_DATA,color:m.opp_shots.serve.first.pct_deuce>=65?R:A}}>{m.opp_shots.serve.first.pct_deuce}%</span></div>}
              {m.opp_shots.serve?.first?.spd_ad != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0'}}><span>Avg Speed</span><span style={{fontFamily: FONT_DATA,color:'#888'}}>{m.opp_shots.serve.first.spd_ad} km/h</span></div>}
            </div>
            {/* Opponent groundstrokes */}
            <div>
              <div style={{fontSize:9,color:'#333',fontFamily: FONT_DATA,letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Their Groundstrokes</div>
              {m.opp_shots.forehand?.cc_in != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>FH CC</span><span style={{fontFamily: FONT_DATA,color:m.opp_shots.forehand.cc_in>=75?R:A}}>{m.opp_shots.forehand.cc_in}%</span></div>}
              {m.opp_shots.backhand?.cc_in != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0',borderBottom:'1px solid #161616'}}><span>BH CC</span><span style={{fontFamily: FONT_DATA,color:m.opp_shots.backhand.cc_in>=75?R:A}}>{m.opp_shots.backhand.cc_in}%</span></div>}
              {m.opp_shots.stats?.ue != null && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#666',padding:'3px 0'}}><span>Their UE</span><span style={{fontFamily: FONT_DATA,color:m.opp_shots.stats.ue>35?G:A}}>{m.opp_shots.stats.ue}</span></div>}
            </div>
          </div>
          {/* Opponent key stats if available */}
          {m.opp_shots.stats?.s2_pts_won_pct != null && (
            <div style={{marginTop:10,padding:'6px 10px',background:'#111',borderRadius:6,fontSize:10,color:'#555',fontFamily: FONT_DATA}}>
              Their 2nd serve pts won: <span style={{color:m.opp_shots.stats.s2_pts_won_pct<45?G:A}}>{m.opp_shots.stats.s2_pts_won_pct}%</span>
              {m.opp_shots.stats?.total_pts_won_pct != null && <> · Total pts won: <span style={{color:'#666'}}>{m.opp_shots.stats.total_pts_won_pct}%</span></>}
            </div>
          )}
        </div>
      )}

      {(m.what_worked||m.what_didnt||m.key_number) && (
        <div style={{background:'#0e0e0e',border:'1px solid #1e1e1e',borderRadius:12,padding:20}}>
          <div style={{fontFamily: FONT_DATA,fontSize:11,letterSpacing:2,color:A,marginBottom:14}}>COACH'S READ</div>
          {m.what_worked&&<><div style={{fontSize:10,letterSpacing:1.5,color:'#444',textTransform:'uppercase',fontFamily: FONT_DATA,marginBottom:6}}>What Worked</div>
          <ul style={{listStyle:'none',padding:0,marginBottom:10}}>{(Array.isArray(m.what_worked)?m.what_worked:Object.values(m.what_worked)).map((x:any,i:number)=><li key={i} style={{paddingLeft:14,position:'relative',fontSize:13,color:'#bbb',lineHeight:1.6,paddingBottom:3}}><span style={{position:'absolute',left:0,color:'#333'}}>—</span>{x}</li>)}</ul></>}
          {m.what_didnt&&<><div style={{fontSize:10,letterSpacing:1.5,color:'#444',textTransform:'uppercase',fontFamily: FONT_DATA,marginBottom:6,marginTop:10}}>What Didn't</div>
          <ul style={{listStyle:'none',padding:0,marginBottom:10}}>{(Array.isArray(m.what_didnt)?m.what_didnt:Object.values(m.what_didnt)).map((x:any,i:number)=><li key={i} style={{paddingLeft:14,position:'relative',fontSize:13,color:'#bbb',lineHeight:1.6,paddingBottom:3}}><span style={{position:'absolute',left:0,color:'#333'}}>—</span>{x}</li>)}</ul></>}
          {m.key_number&&<div style={{background:'rgba(248,113,113,0.08)',borderLeft:'3px solid #f87171',padding:'10px 14px',borderRadius:'0 8px 8px 0',color:R,fontSize:13,lineHeight:1.6}}>{m.key_number}</div>}
        </div>
      )}
    </div>
  )
}
