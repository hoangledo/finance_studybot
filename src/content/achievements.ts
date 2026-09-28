/** Badges: each is a simple rule over a snapshot of your stats. */

export interface Stats {
  lessonsDone: number
  lessonsTotal: number
  unitsDone: number
  level: number
  bestStreak: number
  reviews: number
  cardsMastered: number
  conceptsStarted: number
  conceptsAdded: number
  transactions: number
  monthsTracked: number
  bestMonthSavingsRate: number // 0..1, best full month with income
  missionsDone: number
  missionsTotal: number
  simRuns: number
  simBestGrade: string | null // 'A' | 'B' | ...
}

export interface AchievementDef {
  id: string
  emoji: string
  title: string
  hint: string // how to earn it
  test: (s: Stats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-lesson', emoji: '🌱', title: 'First steps', hint: 'Finish your first lesson', test: (s) => s.lessonsDone >= 1 },
  { id: 'unit-cleared', emoji: '🏁', title: 'Unit cleared', hint: 'Finish every lesson in a unit', test: (s) => s.unitsDone >= 1 },
  { id: 'halfway', emoji: '🧭', title: 'Halfway there', hint: 'Finish half the lessons', test: (s) => s.lessonsDone * 2 >= s.lessonsTotal },
  { id: 'path-complete', emoji: '🏆', title: 'Path complete', hint: 'Finish every lesson', test: (s) => s.lessonsDone >= s.lessonsTotal },
  { id: 'streak-7', emoji: '🔥', title: 'On fire', hint: 'Reach a 7-day streak', test: (s) => s.bestStreak >= 7 },
  { id: 'streak-30', emoji: '☄️', title: 'Unstoppable', hint: 'Reach a 30-day streak', test: (s) => s.bestStreak >= 30 },
  { id: 'reviews-100', emoji: '🃏', title: 'Memory athlete', hint: 'Do 100 card reviews', test: (s) => s.reviews >= 100 },
  { id: 'mastered-10', emoji: '🧠', title: 'Sharp mind', hint: 'Master 10 cards (3+ weeks of memory)', test: (s) => s.cardsMastered >= 10 },
  { id: 'mastered-50', emoji: '🎓', title: 'Money scholar', hint: 'Master 50 cards', test: (s) => s.cardsMastered >= 50 },
  { id: 'explorer', emoji: '🗺️', title: 'Map explorer', hint: 'Start learning 30 concepts', test: (s) => s.conceptsStarted >= 30 },
  { id: 'author', emoji: '✍️', title: 'Author', hint: 'Add your own concept', test: (s) => s.conceptsAdded >= 1 },
  { id: 'librarian', emoji: '📚', title: 'Librarian', hint: 'Add 10 of your own concepts', test: (s) => s.conceptsAdded >= 10 },
  { id: 'first-entry', emoji: '🧾', title: 'Money tracker', hint: 'Log your first income or expense', test: (s) => s.transactions >= 1 },
  { id: 'three-months', emoji: '📅', title: 'Steady tracker', hint: 'Track money in 3 different months', test: (s) => s.monthsTracked >= 3 },
  { id: 'saver-20', emoji: '💰', title: 'Super saver', hint: 'Save 20%+ of income in a month', test: (s) => s.bestMonthSavingsRate >= 0.2 },
  { id: 'mission-1', emoji: '🎯', title: 'Doer', hint: 'Complete a real-world mission', test: (s) => s.missionsDone >= 1 },
  { id: 'mission-5', emoji: '🚀', title: 'Action hero', hint: 'Complete 5 missions', test: (s) => s.missionsDone >= 5 },
  { id: 'mission-all', emoji: '👑', title: 'Mission master', hint: 'Complete every mission', test: (s) => s.missionsDone >= s.missionsTotal },
  { id: 'sim-played', emoji: '🎲', title: 'Life rehearsal', hint: 'Play the Life Simulator', test: (s) => s.simRuns >= 1 },
  { id: 'sim-a', emoji: '🌟', title: 'Money wizard', hint: 'Score an A in the Life Simulator', test: (s) => s.simBestGrade === 'A' },
  { id: 'level-5', emoji: '⭐', title: 'Rising star', hint: 'Reach level 5', test: (s) => s.level >= 5 },
  { id: 'level-10', emoji: '💫', title: 'Seasoned', hint: 'Reach level 10', test: (s) => s.level >= 10 },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))

/** Badge ids whose rule passes for these stats. */
export function earnedAchievements(s: Stats): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(s)).map((a) => a.id)
}
