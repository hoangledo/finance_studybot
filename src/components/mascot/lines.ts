/** Cappy's lines, grouped by moment. Short, warm, a little nerdy about money. */
export const LINES = {
  morning: ["Morning! Coffee's cheaper at home, just saying.", 'Rise and compound!', 'Good morning, future millionaire.'],
  afternoon: ['Afternoon check-in: how are those index funds?', 'A little learning now, a lot of interest later.', 'Hey there, money friend!'],
  evening: ['Evening study session? Very Boglehead of you.', 'Wind down with a lesson — it compounds overnight.', "Let's end the day richer (in knowledge)."],
  atRisk: ["Your streak is getting sleepy… one quick lesson?", "Don't let the streak slip! Even 2 minutes counts.", 'Psst. Streak. Tonight. You got this.'],
  goalDone: ["Daily goal done! I'm so proud I could buy an ETF.", 'Goal crushed. Time in the market, time in the app!', "You hit your goal! Treat yourself (to a 0.03% expense ratio)."],
  correct: ['Nailed it!', 'Correct! Your future self says thanks.', "That's the Boglehead way!", 'Money brain activated!', 'Exactly right!', 'Compound that knowledge!'],
  wrong: ["No worries — even the market has red days.", "Oops! That's how we learn.", 'Close! Stay the course.', "Mistakes are just tuition. Cheap tuition!"],
  lessonDone: ['Look at you go!', 'Another brick in your financial fortress!', "That's what I call a high-yield session!"],
  reviewDone: ['Reviews done! Your memory thanks you.', 'Spaced repetition champion!', 'Brain: rebalanced.'],
  empty: ['Nothing due! Enjoy a calm, capybara-like moment.', "All caught up. Let's learn something new?"],
  levelUp: ['LEVEL UP! Your wealth of knowledge is compounding!', 'New level! I knew you had it in you.'],
  welcome: ["Hi, I'm Cappy! I'll help you master money — one tiny lesson at a time."],
  funFact: ['Fun fact for you:', "Here's something neat:", 'Did you know?'],
} as const

export function pick(key: keyof typeof LINES, seed?: number) {
  const arr = LINES[key]
  const i = seed === undefined ? Math.floor(Math.random() * arr.length) : Math.abs(seed) % arr.length
  return arr[i]
}
