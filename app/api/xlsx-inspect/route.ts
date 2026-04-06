// xlsx-inspect — debug endpoint only
// Accepts an xlsx upload, returns all sheets as raw JSON. No parsing logic.

import * as XLSX from 'xlsx'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })

    const sheets: Record<string, { headers: any[]; rows: any[][] }> = {}

    for (const name of wb.SheetNames) {
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null }) as any[][]
      sheets[name] = {
        headers: raw[0] ?? [],
        rows: raw.slice(1),
      }
    }

    return NextResponse.json({ sheets, sheetNames: wb.SheetNames })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read xlsx' }, { status: 500 })
  }
}
