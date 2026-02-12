import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, CheckCircle, ExternalLink } from 'lucide-react'
import { CO2_MAP, ECO_POINTS_MAP } from '../utils/data.js'

export default function BuyModal({ item, onClose }) {
  const [step, setStep] = useState('confirm') // confirm | signing | success

  const co2  = CO2_MAP[item.category] || 1000
  const pts  = ECO_POINTS_MAP[item.category] || 10
  const fee  = (item.price * 0.01).toFixed(3)
  const msgs = {
    books:       `You saved ${(co2/1000).toFixed(1)} kg CO₂ — like not printing 4 textbooks 📚`,
    cycles:      `You saved ${(co2/1000).toFixed(1)} kg CO₂ — skipping ${Math.round(co2/171)} km of car travel 🚗`,
    electronics: `You saved ${(co2/1000).toFixed(1)} kg CO₂ — equal to ${Math.round(co2*0.065)} phone charges 📱`,
    default:     `You saved ${(co2/1000).toFixed(1)} kg CO₂ by choosing to reuse 🌱`,
  }
  const ecoMsg = msgs[item.category] || msgs.default

  const handleBuy = () => {
    setStep('signing')
    setTimeout(() => setStep('success'), 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50
                   flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="glass-bright border border-white/8 rounded-3xl p-8 w-full max-w-md relative"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-obsidian-4
                       flex items-center justify-center text-ink-2 hover:text-ink-1
                       hover:bg-obsidian-5 transition-all"
          >
            <X size={15} />
          </button>

          {/* ── CONFIRM STEP ── */}
          {step === 'confirm' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="font-mono text-xs text-cyan uppercase tracking-widest mb-2">
                Smart Contract Escrow
              </div>
              <h2 className="font-display font-bold text-2xl text-ink-1 mb-1">
                {item.title}
              </h2>
              <p className="text-sm text-ink-2 font-light mb-6">
                Funds locked on-chain until you confirm delivery.
              </p>

              {/* Escrow breakdown */}
              <div className="bg-obsidian-4 border border-acid/15 rounded-2xl p-5 mb-5">
                {[
                  ['Item Price',      `${item.price.toFixed(2)} ALGO`],
                  ['Platform Fee (1%)', `${fee} ALGO`],
                  ['Network Fee',     '0.001 ALGO'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center mb-3 last:mb-0">
                    <span className="text-sm text-ink-3">{k}</span>
                    <span className="font-mono text-sm text-ink-1">{v}</span>
                  </div>
                ))}
                <div className="border-t border-white/6 pt-3 mt-3 flex justify-between">
                  <span className="font-display font-semibold text-ink-1">Total Locked</span>
                  <span className="font-display font-bold text-gold text-lg">
                    {item.price.toFixed(2)} ALGO
                  </span>
                </div>
              </div>

              {/* Escrow address preview */}
              <div className="flex items-center gap-2 bg-obsidian-3 border border-white/6
                              rounded-xl px-4 py-3 mb-6">
                <Lock size={14} className="text-cyan flex-shrink-0" />
                <span className="font-mono text-xs text-ink-2 truncate">
                  Escrow: MOCK_ESCROW_APP_{item.id}…
                </span>
                <ExternalLink size={12} className="text-ink-3 flex-shrink-0 ml-auto" />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBuy}
                className="btn-cyan w-full py-4 text-base flex items-center justify-center gap-2"
              >
                <Lock size={16} />
                Fund Escrow with Pera Wallet
              </motion.button>
            </motion.div>
          )}

          {/* ── SIGNING STEP ── */}
          {step === 'signing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-cyan/20 border-t-cyan"
                />
                <div className="absolute inset-3 rounded-full bg-cyan/10 flex items-center justify-center">
                  <Lock size={22} className="text-cyan" />
                </div>
              </div>
              <div className="font-display text-xl font-bold text-ink-1 mb-2">
                Signing Transaction
              </div>
              <p className="text-sm text-ink-2 font-light">
                Confirm in Pera Wallet…<br />
                <span className="font-mono text-cyan">Algorand Testnet</span>
              </p>
            </motion.div>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="text-center py-4"
            >
              {/* Glow ring */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-acid/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-acid/30 flex items-center justify-center">
                  <CheckCircle size={36} className="text-acid" />
                </div>
              </div>

              <div className="font-display text-2xl font-bold text-acid mb-2">
                Trade Complete!
              </div>

              <div className="glass border border-acid/20 rounded-2xl p-4 mb-5 text-left">
                <div className="font-mono text-xs text-acid uppercase tracking-widest mb-2">
                  Sustainability Impact
                </div>
                <p className="text-sm text-ink-1 leading-relaxed">{ecoMsg}</p>
              </div>

              <div className="flex items-center justify-center gap-3 bg-acid/10 border border-acid/25
                              rounded-xl px-6 py-3 mb-6">
                <span className="text-xl">🌱</span>
                <span className="font-display font-bold text-acid text-lg">+{pts} Eco-Points Earned</span>
              </div>

              <button onClick={onClose} className="btn-outline w-full py-3">
                Awesome, close this →
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}