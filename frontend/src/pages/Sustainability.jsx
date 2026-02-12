import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LEADERBOARD } from '../utils/data.js'

const MEDALS = ['🥇','🥈','🥉']

const CAT_BARS = [
  { label:'🚲 Cycles',       val:240, color:'bg-cyan'  },
  { label:'💻 Electronics',  val:180, color:'bg-acid'  },
  { label:'🪑 Furniture',    val:120, color:'bg-gold'  },
  { label:'⚽ Sports',       val:80,  color:'bg-rose'  },
  { label:'📚 Books',        val:60,  color:'bg-cyan'  },
  { label:'👕 Clothing',     val:40,  color:'bg-acid'  },
]

const IMPACT_CARDS = [
  { icon:'🌳', val:'201',     unit:'trees', desc:'Equivalent trees worth of CO₂ absorbed' },
  { icon:'🚗', val:'24,673',  unit:'km',    desc:'Car kilometres our campus collectively avoided' },
  { icon:'📱', val:'612,000', unit:'charges', desc:'Smartphone charges worth of energy saved' },
]

function AnimatedNum({ target, duration = 2000 }) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true) },
      { threshold: 0.3 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let start
    const animate = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, target, duration])

  return <span ref={ref}>{val.toLocaleString()}</span>
}

export default function Sustainability() {
  const [barsVisible, setBarsVisible] = useState(false)
  const barsRef = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setBarsVisible(true) },
      { threshold: 0.2 }
    )
    if (barsRef.current) obs.observe(barsRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen max-w-screen-lg mx-auto px-4 md:px-8 py-10">

      {/* ── BIG HERO NUMBER ── */}
      <section className="text-center py-16 relative">
        <div className="absolute inset-0 bg-glow-acid opacity-20 blur-3xl pointer-events-none" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="section-label justify-center flex mb-4"
        >
          Campus Impact This Semester
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type:'spring' }}
          className="font-display font-extrabold leading-none mb-3"
          style={{ fontSize:'clamp(4.5rem, 15vw, 10rem)' }}
        >
          <span className="text-acid" style={{ textShadow:'0 0 80px rgba(57,255,20,0.4)' }}>
            <AnimatedNum target={4219} />
          </span>
        </motion.div>
        <div className="font-mono text-sm text-ink-3 uppercase tracking-[0.2em] mb-3">
          Kilograms of CO₂ Saved
        </div>
        <p className="text-ink-2 font-light">
          Equivalent to planting{' '}
          <span className="text-acid font-semibold">201 trees</span>
          {' '}or not driving{' '}
          <span className="text-acid font-semibold">24,673 km</span>
        </p>
      </section>

      {/* ── IMPACT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
        {IMPACT_CARDS.map((card, i) => (
          <motion.div
            key={card.unit}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass border border-acid/15 rounded-2xl p-6 text-center
                       hover:border-acid/30 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="text-4xl mb-3">{card.icon}</div>
            <div className="font-display font-bold text-3xl text-ink-1 mb-1">{card.val}</div>
            <div className="font-mono text-xs text-acid uppercase tracking-widest mb-2">{card.unit}</div>
            <div className="text-xs text-ink-2 font-light leading-relaxed">{card.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* ── CATEGORY BARS ── */}
      <section ref={barsRef} className="glass border border-white/6 rounded-2xl p-7 mb-8">
        <div className="section-label mb-4">Impact by Category</div>
        <h2 className="font-display font-bold text-2xl text-ink-1 mb-7">CO₂ Saved Breakdown</h2>
        <div className="space-y-4">
          {CAT_BARS.map(bar => (
            <div key={bar.label} className="flex items-center gap-4">
              <div className="text-sm font-body w-32 flex-shrink-0 text-ink-2">{bar.label}</div>
              <div className="flex-1 h-2.5 bg-obsidian-4 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: barsVisible ? `${Math.round(bar.val / 240 * 100)}%` : 0 }}
                  transition={{ duration: 1.2, ease:'easeOut', delay: 0.1 }}
                  className={`h-full rounded-full ${bar.color} opacity-80`}
                />
              </div>
              <div className="font-mono text-xs text-acid w-14 text-right">{bar.val} kg</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LEADERBOARD ── */}
      <section className="glass border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/6 flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-ink-1">🏆 Eco-Points Leaderboard</h2>
          <span className="tag-acid text-[0.65rem]">This Semester</span>
        </div>

        {LEADERBOARD.map((user, i) => (
          <motion.div
            key={user.name}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="flex items-center gap-4 px-6 py-4 border-b border-white/4
                       hover:bg-obsidian-3 transition-colors group"
          >
            {/* Rank */}
            <div className="w-8 text-center font-display font-bold text-lg flex-shrink-0">
              {MEDALS[i] || <span className="text-ink-3 text-sm font-mono">#{i+1}</span>}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-acid
                            flex items-center justify-center text-obsidian font-bold text-sm flex-shrink-0">
              {user.initial}
            </div>

            {/* Name + college */}
            <div className="flex-1 min-w-0">
              <div className="font-body font-medium text-ink-1 text-sm">{user.name}</div>
              <div className="font-mono text-[0.65rem] text-ink-3">{user.college}</div>
            </div>

            {/* Trades */}
            <div className="text-center hidden sm:block">
              <div className="font-mono text-sm text-ink-1">{user.trades}</div>
              <div className="font-mono text-[0.6rem] text-ink-3">trades</div>
            </div>

            {/* CO2 */}
            <div className="text-center hidden md:block">
              <div className="font-mono text-sm text-acid">{user.co2} kg</div>
              <div className="font-mono text-[0.6rem] text-ink-3">CO₂ saved</div>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <div className="font-display font-bold text-lg text-acid">
                🌱 {user.points}
              </div>
              <div className="font-mono text-[0.6rem] text-ink-3">eco-points</div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  )
}