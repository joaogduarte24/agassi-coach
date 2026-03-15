import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Match = {
  id: string
  date: string
  opponent_name: string
  opponent_utr: number | null
  surface: string
  score_sets: string
  score_sets_arr: number[][]
  score_winner: 'JD' | 'opponent'
  serve: any
  return: any
  forehand: any
  backhand: any
  shot_stats: any
  what_worked: string[]
  what_didnt: string[]
  key_number: string
}

// Convert DB row → app match object
export function dbToMatch(row: any) {
  return {
    id: row.id,
    date: row.date,
    opponent: { name: row.opponent_name, utr: row.opponent_utr },
    surface: row.surface,
    score: { sets: row.score_sets, sets_arr: row.score_sets_arr, winner: row.score_winner },
    serve: row.serve,
    return: row.return,
    forehand: row.forehand,
    backhand: row.backhand,
    shot_stats: row.shot_stats,
    what_worked: row.what_worked,
    what_didnt: row.what_didnt,
    key_number: row.key_number,
  }
}

// Convert app match object → DB row
export function matchToDb(m: any) {
  return {
    id: m.id,
    date: m.date,
    opponent_name: m.opponent?.name || 'Unknown',
    opponent_utr: m.opponent?.utr || null,
    surface: m.surface,
    score_sets: m.score?.sets,
    score_sets_arr: m.score?.sets_arr,
    score_winner: m.score?.winner,
    serve: m.serve,
    return: m.return,
    forehand: m.forehand,
    backhand: m.backhand,
    shot_stats: m.shot_stats,
    what_worked: m.what_worked,
    what_didnt: m.what_didnt,
    key_number: m.key_number,
  }
}
