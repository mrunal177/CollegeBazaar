import { motion } from 'framer-motion'
import { ExternalLink, Copy, CheckCircle, ShoppingBag, Leaf, Star, Zap } from 'lucide-react'
import { useState } from 'react'
import { LISTINGS } from '../utils/data.js'

const WALLET = 'ABC1DEF2GHI3JKL4MNO5PQR6STU7VWX8YZ23'

export default function Profile() {
  const [copied, setCopied] = useState(false)

  const copyWallet = () => {
    navigator.clipboard.writeText(WALLET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const myListings = LISTINGS.slice(0, 4)

  const stats = [
    { icon: ShoppingBag, label:'Trades Done',    value:'12',   unit:'',    color:'text-cyan',  glow:'border-cyan/20  bg-cyan/5'  },
    { icon: Leaf,        label:'Eco Points',     value:'340',  unit:'pts', color:'text-acid',  glow:'border-acid/20  bg-acid/5'  },
    { icon: Leaf,        label:'CO₂ Saved',      value:'8.4',  unit:'kg',  color:'text-acid',  glow:'border-acid/20  bg-acid/5'  },
    { icon: Star,        label:'Reputation',     value:'92',   unit:'/100',color:'text-gold',  glow:'border-gold/20  bg-gold/5'  },
  ]

  return (
    <div className="min-h-screen max-w-screen-md mx-auto px-4 md:px-8 py-10">

      {/* ── PROFILE HERO ── */}
      <motion.div
        initial={{ opacity:0, y:20 }}
        animate={{ opacity:1, y:0 }}
        className="glass border border-white/6 rounded-3xl p-7 mb-6 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-glow-cyan opacity-20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan to-acid
                            flex items-center justify-center font-display font-bold text-3xl
                            text-obsidian shadow-glow-cyan">
              A
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-acid rounded-full
                            border-2 border-obsidian flex items-center justify-center">
              <CheckCircle size={10} className="text-obsidian" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-3xl text-ink-1 mb-1">Aanan</h1>
            <div className="font-mono text-xs text-ink-3 mb-3">
              aanan@vitp.ac.in
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="tag-acid">✓ Verified Student</span>
              <span className="tag-cyan">⛓ Algorand Testnet</span>
              <span className="tag-gold" style={{background:'rgba(255,209,102,0.1)',color:'#FFD166',border:'1px solid rgba(255,209,102,0.25)'}}>
                🏆 Top Seller
              </span>
            </div>
          </div>

          {/* Wallet */}
          <button
            onClick={copyWallet}
            className="flex items-center gap-2 bg-obsidian-4 border border-white/8
                       rounded-xl px-4 py-2.5 hover:border-cyan/30 transition-all group flex-shrink-0"
          >
            {copied
              ? <CheckCircle size={13} className="text-acid" />
              : <Copy size={13} className="text-ink-3 group-hover:text-cyan transition-colors" />
            }
            <span className="font-mono text-xs text-ink-2 group-hover:text-ink-1 transition-colors">
              {WALLET.slice(0,6)}…{WALLET.slice(-6)}
            </span>
          </button>
        </div>
      </motion.div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map(({ icon: Icon, label, value, unit, color, glow }, i) => (
          <motion.div
            key={label}
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.08 }}
            className={`glass border rounded-2xl p-5 text-center hover:-translate-y-1
                        transition-all duration-300 ${glow}`}
          >
            <Icon size={20} className={`${color} mx-auto mb-2`} />
            <div className={`font-display font-bold text-2xl ${color} mb-0.5`}>
              {value}<span className="text-base font-mono text-ink-3 ml-0.5">{unit}</span>
            </div>
            <div className="font-mono text-[0.62rem] text-ink-3 uppercase tracking-widest">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── ON-CHAIN ACTIVITY ── */}
      <motion.div
        initial={{ opacity:0, y:16 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.2 }}
        className="glass border border-white/6 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="section-label">Blockchain</div>
            <h2 className="font-display font-semibold text-xl text-ink-1">On-Chain Activity</h2>
          </div>
          <a
            href={`https://testnet.algoexplorer.io/address/${WALLET}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-cyan hover:text-acid transition-colors"
          >
            View on Algoexplorer
            <ExternalLink size={11} />
          </a>
        </div>
        {[
          { label:'EcoPoints App ID',  val:'100452891',  status:'active', color:'text-acid'  },
          { label:'Last Escrow App ID',val:'100451234',  status:'confirmed', color:'text-cyan'  },
          { label:'Testnet Balance',   val:'15.23 ALGO', status:'funded', color:'text-gold'  },
          { label:'Verified Badge',    val:'Soulbound ASA #7812', status:'verified', color:'text-rose' },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between py-3 border-b border-white/4 last:border-0">
            <span className="text-sm text-ink-2">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs ${row.color}`}>{row.val}</span>
              <span className="font-mono text-[0.6rem] bg-acid/10 text-acid border border-acid/20
                               rounded-full px-2 py-0.5">
                {row.status}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── MY LISTINGS ── */}
      <motion.div
        initial={{ opacity:0, y:16 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.3 }}
        className="glass border border-white/6 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/6">
          <h2 className="font-display font-semibold text-xl text-ink-1">Your Listings</h2>
        </div>
        {myListings.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity:0, x:-10 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay: 0.3 + i*0.06 }}
            className="flex items-center gap-4 px-6 py-4 border-b border-white/4
                       last:border-0 hover:bg-obsidian-3 transition-colors group"
          >
            <span className="text-2xl flex-shrink-0">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-body font-medium text-ink-1 truncate
                              group-hover:text-cyan transition-colors">
                {item.title}
              </div>
              <div className="font-mono text-[0.65rem] text-ink-3 mt-0.5">
                {item.category} · {item.condition}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-display font-bold text-acid text-base">{item.price} ALGO</div>
              <div className="font-mono text-[0.6rem] text-acid/60 bg-acid/10 border border-acid/20
                              rounded-full px-2 py-0.5 inline-block mt-1">
                open
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}