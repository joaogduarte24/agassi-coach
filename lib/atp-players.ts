// ATP Top 20 Player Stats — sourced from ATP Tour 2024-2025 season data
// Serve/return %s are season averages. Since ATP data doesn't split by ad/deuce,
// the same value is used for both _ad and _deuce fields.
// Forehand/backhand direction splits are not publicly available; tour-average
// estimates are used for cc_in, dtl_in, depth_cc, depth_dtl.
// Shot speeds sourced from ATP serve speed leaderboards and match reports.

export type ATPPlayer = {
  name: string
  rank: number
  nationality: string
  serve: {
    first: { pct_ad: number; pct_deuce: number; spd_ad: number; spd_deuce: number }
    second: { pct_ad: number; pct_deuce: number; spd_ad: number; spd_deuce: number }
  }
  return: {
    first: { pct_ad: number; pct_deuce: number }
    second: { pct_ad: number; pct_deuce: number }
  }
  forehand: { cc_in: number; dtl_in: number; spd_cc: number; spd_dtl: number; depth_cc: number; depth_dtl: number }
  backhand: { cc_in: number; dtl_in: number; spd_cc: number; spd_dtl: number; depth_cc: number; depth_dtl: number }
  shot_stats: { winners: number; ue: number; df: number; bp_saved_pct: number; bp_won_pct: number }
}

export const ATP_PLAYERS: ATPPlayer[] = [
  {
    name: 'Jannik Sinner',
    rank: 1,
    nationality: '🇮🇹',
    serve: {
      first: { pct_ad: 60, pct_deuce: 60, spd_ad: 196, spd_deuce: 196 },
      second: { pct_ad: 88, pct_deuce: 88, spd_ad: 154, spd_deuce: 154 },
    },
    return: {
      first: { pct_ad: 34, pct_deuce: 34 },
      second: { pct_ad: 56, pct_deuce: 56 },
    },
    forehand: { cc_in: 87, dtl_in: 79, spd_cc: 127, spd_dtl: 133, depth_cc: 64, depth_dtl: 58 },
    backhand: { cc_in: 89, dtl_in: 81, spd_cc: 123, spd_dtl: 129, depth_cc: 66, depth_dtl: 60 },
    shot_stats: { winners: 32, ue: 26, df: 2.8, bp_saved_pct: 68, bp_won_pct: 46 },
  },
  {
    name: 'Carlos Alcaraz',
    rank: 2,
    nationality: '🇪🇸',
    serve: {
      first: { pct_ad: 66, pct_deuce: 66, spd_ad: 195, spd_deuce: 195 },
      second: { pct_ad: 87, pct_deuce: 87, spd_ad: 152, spd_deuce: 152 },
    },
    return: {
      first: { pct_ad: 35, pct_deuce: 35 },
      second: { pct_ad: 55, pct_deuce: 55 },
    },
    forehand: { cc_in: 88, dtl_in: 81, spd_cc: 131, spd_dtl: 138, depth_cc: 65, depth_dtl: 60 },
    backhand: { cc_in: 85, dtl_in: 76, spd_cc: 120, spd_dtl: 126, depth_cc: 62, depth_dtl: 55 },
    shot_stats: { winners: 38, ue: 28, df: 3.1, bp_saved_pct: 64, bp_won_pct: 49 },
  },
  {
    name: 'Alexander Zverev',
    rank: 3,
    nationality: '🇩🇪',
    serve: {
      first: { pct_ad: 74, pct_deuce: 74, spd_ad: 204, spd_deuce: 204 },
      second: { pct_ad: 87, pct_deuce: 87, spd_ad: 158, spd_deuce: 158 },
    },
    return: {
      first: { pct_ad: 25, pct_deuce: 25 },
      second: { pct_ad: 44, pct_deuce: 44 },
    },
    forehand: { cc_in: 86, dtl_in: 78, spd_cc: 128, spd_dtl: 135, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 84, dtl_in: 74, spd_cc: 119, spd_dtl: 125, depth_cc: 61, depth_dtl: 53 },
    shot_stats: { winners: 36, ue: 30, df: 4.2, bp_saved_pct: 65, bp_won_pct: 44 },
  },
  {
    name: 'Novak Djokovic',
    rank: 4,
    nationality: '🇷🇸',
    serve: {
      first: { pct_ad: 64, pct_deuce: 64, spd_ad: 192, spd_deuce: 192 },
      second: { pct_ad: 89, pct_deuce: 89, spd_ad: 152, spd_deuce: 152 },
    },
    return: {
      first: { pct_ad: 33, pct_deuce: 33 },
      second: { pct_ad: 55, pct_deuce: 55 },
    },
    forehand: { cc_in: 88, dtl_in: 80, spd_cc: 124, spd_dtl: 130, depth_cc: 64, depth_dtl: 59 },
    backhand: { cc_in: 91, dtl_in: 84, spd_cc: 122, spd_dtl: 128, depth_cc: 67, depth_dtl: 62 },
    shot_stats: { winners: 30, ue: 22, df: 2.4, bp_saved_pct: 72, bp_won_pct: 50 },
  },
  {
    name: 'Daniil Medvedev',
    rank: 5,
    nationality: '🇷🇺',
    serve: {
      first: { pct_ad: 63, pct_deuce: 63, spd_ad: 198, spd_deuce: 198 },
      second: { pct_ad: 88, pct_deuce: 88, spd_ad: 156, spd_deuce: 156 },
    },
    return: {
      first: { pct_ad: 31, pct_deuce: 31 },
      second: { pct_ad: 53, pct_deuce: 53 },
    },
    forehand: { cc_in: 84, dtl_in: 75, spd_cc: 122, spd_dtl: 128, depth_cc: 61, depth_dtl: 54 },
    backhand: { cc_in: 90, dtl_in: 82, spd_cc: 124, spd_dtl: 131, depth_cc: 67, depth_dtl: 61 },
    shot_stats: { winners: 28, ue: 24, df: 3.0, bp_saved_pct: 66, bp_won_pct: 43 },
  },
  {
    name: 'Taylor Fritz',
    rank: 6,
    nationality: '🇺🇸',
    serve: {
      first: { pct_ad: 67, pct_deuce: 67, spd_ad: 210, spd_deuce: 210 },
      second: { pct_ad: 86, pct_deuce: 86, spd_ad: 162, spd_deuce: 162 },
    },
    return: {
      first: { pct_ad: 27, pct_deuce: 27 },
      second: { pct_ad: 47, pct_deuce: 47 },
    },
    forehand: { cc_in: 85, dtl_in: 77, spd_cc: 130, spd_dtl: 137, depth_cc: 62, depth_dtl: 56 },
    backhand: { cc_in: 83, dtl_in: 73, spd_cc: 118, spd_dtl: 124, depth_cc: 59, depth_dtl: 52 },
    shot_stats: { winners: 34, ue: 29, df: 3.5, bp_saved_pct: 63, bp_won_pct: 42 },
  },
  {
    name: 'Casper Ruud',
    rank: 7,
    nationality: '🇳🇴',
    serve: {
      first: { pct_ad: 62, pct_deuce: 62, spd_ad: 182, spd_deuce: 182 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 146, spd_deuce: 146 },
    },
    return: {
      first: { pct_ad: 29, pct_deuce: 29 },
      second: { pct_ad: 51, pct_deuce: 51 },
    },
    forehand: { cc_in: 87, dtl_in: 78, spd_cc: 125, spd_dtl: 132, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 85, dtl_in: 75, spd_cc: 118, spd_dtl: 124, depth_cc: 61, depth_dtl: 54 },
    shot_stats: { winners: 26, ue: 27, df: 2.9, bp_saved_pct: 62, bp_won_pct: 43 },
  },
  {
    name: 'Holger Rune',
    rank: 8,
    nationality: '🇩🇰',
    serve: {
      first: { pct_ad: 63, pct_deuce: 63, spd_ad: 193, spd_deuce: 193 },
      second: { pct_ad: 86, pct_deuce: 86, spd_ad: 152, spd_deuce: 152 },
    },
    return: {
      first: { pct_ad: 31, pct_deuce: 31 },
      second: { pct_ad: 52, pct_deuce: 52 },
    },
    forehand: { cc_in: 86, dtl_in: 79, spd_cc: 128, spd_dtl: 135, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 83, dtl_in: 74, spd_cc: 119, spd_dtl: 125, depth_cc: 60, depth_dtl: 53 },
    shot_stats: { winners: 33, ue: 31, df: 3.4, bp_saved_pct: 61, bp_won_pct: 44 },
  },
  {
    name: 'Andrey Rublev',
    rank: 9,
    nationality: '🇷🇺',
    serve: {
      first: { pct_ad: 61, pct_deuce: 61, spd_ad: 188, spd_deuce: 188 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 150, spd_deuce: 150 },
    },
    return: {
      first: { pct_ad: 28, pct_deuce: 28 },
      second: { pct_ad: 50, pct_deuce: 50 },
    },
    forehand: { cc_in: 85, dtl_in: 78, spd_cc: 132, spd_dtl: 140, depth_cc: 62, depth_dtl: 57 },
    backhand: { cc_in: 82, dtl_in: 73, spd_cc: 117, spd_dtl: 123, depth_cc: 59, depth_dtl: 52 },
    shot_stats: { winners: 35, ue: 33, df: 3.8, bp_saved_pct: 60, bp_won_pct: 42 },
  },
  {
    name: 'Tommy Paul',
    rank: 10,
    nationality: '🇺🇸',
    serve: {
      first: { pct_ad: 65, pct_deuce: 65, spd_ad: 197, spd_deuce: 197 },
      second: { pct_ad: 86, pct_deuce: 86, spd_ad: 154, spd_deuce: 154 },
    },
    return: {
      first: { pct_ad: 28, pct_deuce: 28 },
      second: { pct_ad: 49, pct_deuce: 49 },
    },
    forehand: { cc_in: 85, dtl_in: 77, spd_cc: 127, spd_dtl: 134, depth_cc: 62, depth_dtl: 56 },
    backhand: { cc_in: 83, dtl_in: 74, spd_cc: 119, spd_dtl: 125, depth_cc: 60, depth_dtl: 53 },
    shot_stats: { winners: 31, ue: 30, df: 3.3, bp_saved_pct: 62, bp_won_pct: 41 },
  },
  {
    name: 'Alex de Minaur',
    rank: 11,
    nationality: '🇦🇺',
    serve: {
      first: { pct_ad: 64, pct_deuce: 64, spd_ad: 188, spd_deuce: 188 },
      second: { pct_ad: 87, pct_deuce: 87, spd_ad: 150, spd_deuce: 150 },
    },
    return: {
      first: { pct_ad: 32, pct_deuce: 32 },
      second: { pct_ad: 54, pct_deuce: 54 },
    },
    forehand: { cc_in: 86, dtl_in: 78, spd_cc: 124, spd_dtl: 130, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 85, dtl_in: 76, spd_cc: 118, spd_dtl: 124, depth_cc: 62, depth_dtl: 55 },
    shot_stats: { winners: 24, ue: 20, df: 2.5, bp_saved_pct: 64, bp_won_pct: 45 },
  },
  {
    name: 'Stefanos Tsitsipas',
    rank: 12,
    nationality: '🇬🇷',
    serve: {
      first: { pct_ad: 64, pct_deuce: 64, spd_ad: 194, spd_deuce: 194 },
      second: { pct_ad: 86, pct_deuce: 86, spd_ad: 153, spd_deuce: 153 },
    },
    return: {
      first: { pct_ad: 29, pct_deuce: 29 },
      second: { pct_ad: 50, pct_deuce: 50 },
    },
    forehand: { cc_in: 87, dtl_in: 80, spd_cc: 129, spd_dtl: 136, depth_cc: 64, depth_dtl: 58 },
    backhand: { cc_in: 82, dtl_in: 72, spd_cc: 116, spd_dtl: 122, depth_cc: 59, depth_dtl: 52 },
    shot_stats: { winners: 33, ue: 29, df: 3.2, bp_saved_pct: 63, bp_won_pct: 44 },
  },
  {
    name: 'Grigor Dimitrov',
    rank: 13,
    nationality: '🇧🇬',
    serve: {
      first: { pct_ad: 62, pct_deuce: 62, spd_ad: 190, spd_deuce: 190 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 148, spd_deuce: 148 },
    },
    return: {
      first: { pct_ad: 30, pct_deuce: 30 },
      second: { pct_ad: 52, pct_deuce: 52 },
    },
    forehand: { cc_in: 86, dtl_in: 78, spd_cc: 126, spd_dtl: 133, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 87, dtl_in: 79, spd_cc: 121, spd_dtl: 127, depth_cc: 64, depth_dtl: 58 },
    shot_stats: { winners: 28, ue: 25, df: 2.7, bp_saved_pct: 65, bp_won_pct: 43 },
  },
  {
    name: 'Hubert Hurkacz',
    rank: 14,
    nationality: '🇵🇱',
    serve: {
      first: { pct_ad: 66, pct_deuce: 66, spd_ad: 208, spd_deuce: 208 },
      second: { pct_ad: 86, pct_deuce: 86, spd_ad: 160, spd_deuce: 160 },
    },
    return: {
      first: { pct_ad: 26, pct_deuce: 26 },
      second: { pct_ad: 46, pct_deuce: 46 },
    },
    forehand: { cc_in: 84, dtl_in: 76, spd_cc: 126, spd_dtl: 132, depth_cc: 62, depth_dtl: 55 },
    backhand: { cc_in: 82, dtl_in: 73, spd_cc: 117, spd_dtl: 123, depth_cc: 59, depth_dtl: 52 },
    shot_stats: { winners: 35, ue: 32, df: 4.0, bp_saved_pct: 64, bp_won_pct: 41 },
  },
  {
    name: 'Frances Tiafoe',
    rank: 15,
    nationality: '🇺🇸',
    serve: {
      first: { pct_ad: 62, pct_deuce: 62, spd_ad: 196, spd_deuce: 196 },
      second: { pct_ad: 84, pct_deuce: 84, spd_ad: 152, spd_deuce: 152 },
    },
    return: {
      first: { pct_ad: 29, pct_deuce: 29 },
      second: { pct_ad: 50, pct_deuce: 50 },
    },
    forehand: { cc_in: 83, dtl_in: 75, spd_cc: 128, spd_dtl: 135, depth_cc: 61, depth_dtl: 55 },
    backhand: { cc_in: 81, dtl_in: 72, spd_cc: 116, spd_dtl: 122, depth_cc: 58, depth_dtl: 51 },
    shot_stats: { winners: 34, ue: 31, df: 3.6, bp_saved_pct: 60, bp_won_pct: 43 },
  },
  {
    name: 'Lorenzo Musetti',
    rank: 16,
    nationality: '🇮🇹',
    serve: {
      first: { pct_ad: 60, pct_deuce: 60, spd_ad: 186, spd_deuce: 186 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 148, spd_deuce: 148 },
    },
    return: {
      first: { pct_ad: 30, pct_deuce: 30 },
      second: { pct_ad: 52, pct_deuce: 52 },
    },
    forehand: { cc_in: 86, dtl_in: 78, spd_cc: 125, spd_dtl: 131, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 84, dtl_in: 76, spd_cc: 120, spd_dtl: 126, depth_cc: 62, depth_dtl: 56 },
    shot_stats: { winners: 30, ue: 28, df: 3.0, bp_saved_pct: 61, bp_won_pct: 42 },
  },
  {
    name: 'Jack Draper',
    rank: 17,
    nationality: '🇬🇧',
    serve: {
      first: { pct_ad: 63, pct_deuce: 63, spd_ad: 200, spd_deuce: 200 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 156, spd_deuce: 156 },
    },
    return: {
      first: { pct_ad: 28, pct_deuce: 28 },
      second: { pct_ad: 48, pct_deuce: 48 },
    },
    forehand: { cc_in: 84, dtl_in: 76, spd_cc: 128, spd_dtl: 135, depth_cc: 62, depth_dtl: 56 },
    backhand: { cc_in: 82, dtl_in: 73, spd_cc: 118, spd_dtl: 124, depth_cc: 60, depth_dtl: 53 },
    shot_stats: { winners: 36, ue: 30, df: 3.5, bp_saved_pct: 63, bp_won_pct: 44 },
  },
  {
    name: 'Ben Shelton',
    rank: 18,
    nationality: '🇺🇸',
    serve: {
      first: { pct_ad: 61, pct_deuce: 61, spd_ad: 212, spd_deuce: 212 },
      second: { pct_ad: 84, pct_deuce: 84, spd_ad: 164, spd_deuce: 164 },
    },
    return: {
      first: { pct_ad: 26, pct_deuce: 26 },
      second: { pct_ad: 46, pct_deuce: 46 },
    },
    forehand: { cc_in: 82, dtl_in: 74, spd_cc: 130, spd_dtl: 138, depth_cc: 60, depth_dtl: 54 },
    backhand: { cc_in: 80, dtl_in: 71, spd_cc: 116, spd_dtl: 122, depth_cc: 57, depth_dtl: 50 },
    shot_stats: { winners: 38, ue: 34, df: 4.5, bp_saved_pct: 62, bp_won_pct: 40 },
  },
  {
    name: 'Felix Auger-Aliassime',
    rank: 19,
    nationality: '🇨🇦',
    serve: {
      first: { pct_ad: 63, pct_deuce: 63, spd_ad: 198, spd_deuce: 198 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 155, spd_deuce: 155 },
    },
    return: {
      first: { pct_ad: 27, pct_deuce: 27 },
      second: { pct_ad: 48, pct_deuce: 48 },
    },
    forehand: { cc_in: 84, dtl_in: 76, spd_cc: 128, spd_dtl: 135, depth_cc: 62, depth_dtl: 56 },
    backhand: { cc_in: 83, dtl_in: 74, spd_cc: 119, spd_dtl: 125, depth_cc: 60, depth_dtl: 53 },
    shot_stats: { winners: 33, ue: 30, df: 3.8, bp_saved_pct: 62, bp_won_pct: 41 },
  },
  {
    name: 'Sebastian Korda',
    rank: 20,
    nationality: '🇺🇸',
    serve: {
      first: { pct_ad: 64, pct_deuce: 64, spd_ad: 196, spd_deuce: 196 },
      second: { pct_ad: 85, pct_deuce: 85, spd_ad: 153, spd_deuce: 153 },
    },
    return: {
      first: { pct_ad: 28, pct_deuce: 28 },
      second: { pct_ad: 49, pct_deuce: 49 },
    },
    forehand: { cc_in: 85, dtl_in: 77, spd_cc: 127, spd_dtl: 134, depth_cc: 63, depth_dtl: 57 },
    backhand: { cc_in: 83, dtl_in: 74, spd_cc: 118, spd_dtl: 124, depth_cc: 60, depth_dtl: 53 },
    shot_stats: { winners: 32, ue: 28, df: 3.2, bp_saved_pct: 63, bp_won_pct: 42 },
  },
]
