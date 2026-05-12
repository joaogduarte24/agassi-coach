'use client'
import { col, G, A, R, B, MUTED, MUTED_HI, TRACK, FONT_DATA } from '@/app/lib/helpers'

interface StatBarProps {
  label: string
  val: number | null
  avgVal?: number | null
  oppVal?: number | null
  gThresh: number
  aThresh: number
  suffix?: string
  maxVal?: number
  lowerIsBetter?: boolean
}

export default function StatBar({ label, val, avgVal, oppVal, gThresh, aThresh, suffix='%', maxVal, lowerIsBetter }: StatBarProps) {
  if (val == null) return null
  const scale = suffix === 'km/h' ? (maxVal || 130) : 100
  const color = lowerIsBetter
    ? (val <= gThresh ? G : val <= aThresh ? A : R)
    : col(val, gThresh, aThresh)

  const valPct = lowerIsBetter
    ? 100 - Math.min((val / scale) * 100, 100)
    : Math.min((val / scale) * 100, 100)
  const avgPct = avgVal != null
    ? (lowerIsBetter ? 100 - Math.min((avgVal / scale) * 100, 100) : Math.min((avgVal / scale) * 100, 100))
    : null
  const oppPct = oppVal != null
    ? (lowerIsBetter ? 100 - Math.min((oppVal / scale) * 100, 100) : Math.min((oppVal / scale) * 100, 100))
    : null

  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:2}}>
        <span style={{fontSize:11,color:MUTED_HI}}>{label}</span>
        <span style={{fontFamily:FONT_DATA,fontSize:13,fontWeight:500,color}}>{val}{suffix}</span>
      </div>
      <div style={{display:'flex',alignItems:'baseline',marginBottom:5,fontSize:10,fontFamily:FONT_DATA}}>
        {avgVal != null && <span style={{color:MUTED,flex:1}}>avg {avgVal}{suffix}</span>}
        {oppVal != null && <span style={{color:'rgba(96,165,250,0.6)'}}>opp {oppVal}{suffix}</span>}
      </div>
      <div style={{height:5,background:TRACK,borderRadius:2.5,position:'relative',overflow:'visible'}}>
        <div style={{
          height:'100%',
          width:`${valPct}%`,
          background:color,
          borderRadius:2.5,
          position:'absolute',
          ...(lowerIsBetter ? {right:0} : {left:0}),
          top:0,
        }}/>
        {avgPct != null && (
          <div style={{position:'absolute',top:-3,left:`${avgPct}%`,width:1.5,height:11,background:'rgba(255,255,255,0.55)',borderRadius:1,zIndex:2}} />
        )}
        {oppPct != null && (
          <div style={{position:'absolute',left:`${oppPct}%`,top:'50%',width:5,height:5,background:B,borderRadius:1,transform:'translateX(-50%) translateY(-50%) rotate(45deg)',zIndex:3}} />
        )}
      </div>
    </div>
  )
}
