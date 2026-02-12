import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Shield, Zap, Leaf, Star } from 'lucide-react'

/* Animated counter hook */
function useCounter(target, duration = 1800, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime
    const step = ts => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return val
}

function StatCard({ value, suffix = '', label, delay, start }) {
  const count = useCounter(value, 1600, start)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass border border-white/6 rounded-2xl p-6 text-center
                 hover:border-cyan/25 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="font-display text-4xl font-bold text-gradient-cyan mb-1">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs font-mono text-ink-3 uppercase tracking-widest">{label}</div>
    </motion.div>
  )
}

const steps = [
  { icon: '📦', num: '01', title: 'List Your Item', desc: 'Post in 30 seconds. Escrow contract auto-deploys on Algorand testnet.', color: 'from-cyan/20 to-transparent' },
  { icon: '🔒', num: '02', title: 'Buyer Funds Escrow', desc: 'ALGO locked in smart contract. Seller cannot access funds yet.', color: 'from-acid/20 to-transparent' },
  { icon: '✅', num: '03', title: 'Confirm Delivery', desc: 'Buyer confirms receipt. Contract releases payment instantly.', color: 'from-gold/20 to-transparent' },
  { icon: '🌱', num: '04', title: 'Earn Eco-Points', desc: 'CO₂ saved is recorded on-chain. Climb the sustainability leaderboard.', color: 'from-rose/20 to-transparent' },
]

const features = [
  { icon: Shield, title: 'Zero-Trust Escrow', desc: 'Smart contracts enforce fairness. No middlemen. No disputes.', color: 'text-cyan', glow: 'bg-cyan/10 border-cyan/20' },
  { icon: Zap,    title: '2.78s Finality', desc: 'Algorand confirms faster than any other L1. No waiting around.', color: 'text-gold', glow: 'bg-gold/10 border-gold/20' },
  { icon: Leaf,   title: 'Carbon Negative', desc: 'Built on the only blockchain that absorbs more CO₂ than it emits.', color: 'text-acid', glow: 'bg-acid/10 border-acid/20' },
  { icon: Star,   title: 'On-Chain Reputation', desc: 'Immutable trade history. Reputation you cannot fake or delete.', color: 'text-rose', glow: 'bg-rose/10 border-rose/20' },
]

export default function Home() {
  const navigate = useNavigate()
  const [countStart, setCountStart] = useState(false)
  const statsRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCountStart(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center
                           min-h-[calc(100vh-64px)] px-6 py-20 text-center overflow-hidden">

        {/* Glow blob */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] bg-glow-cyan opacity-30 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="tag-cyan mb-8 animate-glow-pulse"
        >
          ⛓&nbsp;&nbsp;Powered by Algorand Blockchain
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-extrabold text-[clamp(2.8rem,8vw,6.5rem)]
                     leading-[1.02] tracking-tight max-w-4xl mb-6"
        >
          Buy. Sell.{' '}
          <span className="text-gradient-cyan italic">Trust</span>
          <br />the Contract.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-body text-lg text-ink-2 max-w-xl leading-relaxed mb-10 font-light"
        >
          A campus-only decentralized marketplace where smart contract escrow
          guarantees every trade. No trust required — the blockchain enforces it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <button onClick={() => navigate('/browse')} className="btn-cyan flex items-center gap-2 text-base px-8 py-3.5">
            Browse Listings
            <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate('/sell')} className="btn-outline text-base px-8 py-3.5">
            List an Item
          </button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 flex flex-col items-center gap-1 text-ink-3 text-xs font-mono"
        >
          scroll to explore
          <span className="text-base">↓</span>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="px-6 py-16 max-w-screen-lg mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value={247}   label="Active Listings"     delay={0}    start={countStart} />
          <StatCard value={1842}  label="Trades Completed"    delay={0.1}  start={countStart} />
          <StatCard value={4219}  suffix="kg" label="CO₂ Saved"  delay={0.2}  start={countStart} />
          <StatCard value={512}   label="Campus Members"      delay={0.3}  start={countStart} />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-16 max-w-screen-lg mx-auto">
        <div className="section-label text-center">How It Works</div>
        <h2 className="font-display font-bold text-4xl text-center mb-12 text-ink-1">
          Four steps. One contract. Zero fraud.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass border border-white/6 rounded-2xl p-6
                         hover:border-cyan/20 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className="font-mono text-[0.65rem] text-ink-3 tracking-[0.18em] mb-3">{s.num} —</div>
                <div className="text-3xl mb-4">{s.icon}</div>
                <div className="font-display font-semibold text-lg text-ink-1 mb-2">{s.title}</div>
                <div className="text-sm text-ink-2 leading-relaxed font-light">{s.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="px-6 py-16 max-w-screen-lg mx-auto">
        <div className="section-label text-center">Why CampusBazaar</div>
        <h2 className="font-display font-bold text-4xl text-center mb-12 text-ink-1">
          Built different. <span className="text-gradient-cyan">By design.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc, color, glow }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`glass border rounded-2xl p-6 flex gap-5 items-start
                          hover:-translate-y-1 transition-all duration-300 ${glow}`}
            >
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center
                               flex-shrink-0 ${glow} ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="font-display font-semibold text-lg text-ink-1 mb-1">{title}</div>
                <div className="text-sm text-ink-2 leading-relaxed font-light">{desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section className="px-6 py-20 max-w-screen-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-bright border border-cyan/15 rounded-3xl p-12 text-center
                     relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-glow-cyan opacity-20 pointer-events-none" />
          <div className="relative">
            <div className="font-display text-4xl font-bold text-ink-1 mb-4">
              Ready to trade smarter?
            </div>
            <p className="text-ink-2 mb-8 text-lg font-light">
              Join 512 verified students already trading on Algorand testnet.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => navigate('/browse')} className="btn-cyan px-10 py-4 text-base">
                Explore Listings →
              </button>
              <button onClick={() => navigate('/sustain')} className="btn-outline px-10 py-4 text-base">
                See Our Impact 🌱
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}