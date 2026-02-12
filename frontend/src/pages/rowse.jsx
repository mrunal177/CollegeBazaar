import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { LISTINGS, CATEGORIES, CONDITION_META, CO2_MAP, ECO_POINTS_MAP, ALGO_INR } from '../utils/data.js'
import BuyModal from '../components/BuyModal.jsx'
import clsx from 'clsx'

export default function Browse() {
  const [search, setSearch]   = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [buying, setBuying]   = useState(null)

  const filtered = useMemo(() => LISTINGS.filter(l => {
    const matchCat  = activeCat === 'all' || l.category === activeCat
    const matchText = l.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  }), [search, activeCat])

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="section-label">Marketplace</div>
          <h1 className="font-display font-bold text-4xl text-ink-1">
            Browse Items
          </h1>
          <p className="text-ink-2 text-sm mt-1 font-light">
            {filtered.length} items available · Algorand Testnet
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 glass border border-white/8 rounded-xl
                        px-4 py-2.5 min-w-[300px] focus-within:border-cyan/40
                        focus-within:shadow-[0_0_0_3px_rgba(0,212,255,0.08)] transition-all">
          <Search size={16} className="text-ink-3 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search books, cycles, electronics…"
            className="bg-transparent outline-none text-ink-1 text-sm font-body
                       placeholder-ink-3 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-3 hover:text-ink-1 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body whitespace-nowrap',
              'border transition-all duration-150',
              activeCat === cat.id
                ? 'bg-cyan/15 text-cyan border-cyan/35 shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                : 'bg-obsidian-3 text-ink-2 border-white/8 hover:border-white/15 hover:text-ink-1'
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 text-ink-3"
          >
            <div className="text-5xl mb-4">🔍</div>
            <div className="font-display text-xl">No listings found</div>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filtered.map((item, i) => (
              <ListingCard key={item.id} item={item} index={i} onBuy={() => setBuying(item)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {buying && <BuyModal item={buying} onClose={() => setBuying(null)} />}
    </div>
  )
}

function ListingCard({ item, index, onBuy }) {
  const cond = CONDITION_META[item.condition] || CONDITION_META.good
  const co2  = CO2_MAP[item.category] || 1000
  const inr  = Math.round(item.price * ALGO_INR)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass border border-white/6 rounded-2xl overflow-hidden group
                 hover:border-cyan/25 hover:shadow-card-hover transition-all duration-300 cursor-pointer"
    >
      {/* Image area */}
      <div className="relative h-48 bg-obsidian-4 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-3 to-obsidian-5" />
        {/* Animated glow on hover */}
        <div className="absolute inset-0 bg-glow-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="relative text-6xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]
                         group-hover:scale-110 transition-transform duration-300">
          {item.emoji}
        </span>

        {/* Condition badge */}
        <span className={`absolute top-3 left-3 text-xs font-mono px-2.5 py-1 rounded-full border ${cond.color}`}>
          {cond.label}
        </span>

        {/* CO2 badge */}
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-mono
                         bg-acid/15 text-acid border border-acid/25 px-2.5 py-1 rounded-full
                         group-hover:bg-acid/25 group-hover:shadow-glow-acid transition-all duration-300">
          🌱 {(co2 / 1000).toFixed(1)}kg CO₂
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="font-mono text-[0.65rem] text-ink-3 uppercase tracking-widest mb-1.5">
          {item.category}
        </div>
        <h3 className="font-display font-semibold text-base text-ink-1 leading-snug mb-3
                       line-clamp-2 group-hover:text-cyan transition-colors duration-200">
          {item.title}
        </h3>

        {/* Seller row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan to-acid
                          flex items-center justify-center text-obsidian text-[0.6rem] font-bold flex-shrink-0">
            {item.seller[0]}
          </div>
          <span className="text-xs text-ink-2 font-light">{item.seller}</span>
          <span className="ml-auto text-xs text-gold font-mono">★ {item.rep}</span>
        </div>

        {/* Price + Buy */}
        <div className="flex items-center justify-between pt-3 border-t border-white/6">
          <div>
            <div className="font-display font-bold text-2xl text-ink-1">
              {item.price}
              <span className="text-xs text-ink-3 font-mono ml-1">ALGO</span>
            </div>
            <div className="text-xs text-ink-3 font-light">≈ ₹{inr.toLocaleString()}</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBuy}
            className="bg-cyan text-obsidian font-display font-bold text-sm
                       px-4 py-2 rounded-xl hover:shadow-glow-cyan hover:-translate-y-0.5
                       transition-all duration-200"
          >
            Buy Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}