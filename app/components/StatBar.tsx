'use client'
import { col } from '@/app/lib/helpers'

interface StatBarProps {
  label: string
  val: number | null
  avgVal?: number | null
  gThresh: number
  aThresh: number
  suffix?: string
  maxVal?: number
}

export default function StatBar({ label, val, avgVal, gThresh, aThresh, suffix='%', maxVal }: StatBarProps) {
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
