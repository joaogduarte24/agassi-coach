'use client'
import { useState, useRef } from 'react'
import { G, A, R, deepMerge, getMissingFields, IMPORTANT_FIELDS, fmtDate } from '@/app/lib/helpers'

interface FixMatchModalProps {
  match: any
  onPatched: (m: any) => void
  onClose: () => void
}

export default function FixMatchModal({ match, onPatched, onClose }: FixMatchModalProps) {
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
    setLoading(true); setStatus('Extracting from new screenshots...')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, oppName: match.opponent?.name, oppUtr: match.opponent?.utr, surface: match.surface })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      const merged = deepMerge(match, data.match)
      merged.id = match.id
      setStatus('Saving...')
      const saveRes = await fetch('/api/matches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: merged })
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error)
      const stillMissing = getMissingFields(merged)
      setStatus(stillMissing.length === 0 ? 'All stats filled!' : `Saved — ${stillMissing.length} field${stillMissing.length>1?'s':''} still missing`)
      onPatched(merged)
      setTimeout(() => onClose(), 1800)
    } catch(e: any) { setStatus('Error: ' + e.message) }
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
              SwingVision → this match → <strong style={{color:'#666'}}>My Shots</strong> → scroll to the missing section → screenshot → upload below. Existing data is never overwritten.
            </div>
          </div>
        ) : (
          <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:8,padding:12,marginBottom:16,fontSize:12,color:G,fontFamily:'monospace',textAlign:'center'}}>
            All key stats present — nothing to fix
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
