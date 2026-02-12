import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, Leaf, Info, ChevronDown } from 'lucide-react'
import { CO2_MAP, ECO_POINTS_MAP, ALGO_INR } from '../utils/data.js'

const categories = [
  { value:'books',       label:'📚  Books' },
  { value:'cycles',      label:'🚲  Cycles & Scooters' },
  { value:'electronics', label:'💻  Electronics' },
  { value:'furniture',   label:'🪑  Furniture' },
  { value:'clothing',    label:'👕  Clothing' },
  { value:'sports',      label:'⚽  Sports Equipment' },
  { value:'other',       label:'📦  Other' },
]

const conditions = [
  { value:'new',      label:'✨  New' },
  { value:'like_new', label:'🌟  Like New' },
  { value:'good',     label:'👍  Good' },
  { value:'fair',     label:'🔧  Fair' },
]

export default function Sell() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title:'', category:'', condition:'good', price:'', desc:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const co2   = CO2_MAP[form.category] || null
  const pts   = ECO_POINTS_MAP[form.category] || null
  const price = parseFloat(form.price)
  const inr   = price > 0 ? Math.round(price * ALGO_INR) : null

  const handleSubmit = () => {
    if (!form.title || !form.category || !price || price < 1) return
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setDone(true) }, 2000)
    setTimeout(() => navigate('/browse'), 3500)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-label">New Listing</div>
        <h1 className="font-display font-bold text-4xl text-ink-1 mb-2">List an Item</h1>
        <p className="text-ink-2 font-light text-sm mb-8">
          Deploys a smart contract escrow on Algorand Testnet in ~3 seconds.
        </p>
      </motion.div>

      {/* Form sections */}
      <div className="space-y-5">

        {/* Item Details */}
        <FormSection title="📝  Item Details" delay={0.1}>
          <div className="space-y-4">
            <Field label="Item Title">
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Resnick Halliday Physics Vol 1"
                className="input-dark"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <SelectInput value={form.category} onChange={v => set('category', v)} options={categories} placeholder="Select…" />
              </Field>
              <Field label="Condition">
                <SelectInput value={form.condition} onChange={v => set('condition', v)} options={conditions} />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={form.desc}
                onChange={e => set('desc', e.target.value)}
                placeholder="Describe condition, edition, wear and tear…"
                rows={3}
                className="input-dark resize-none"
              />
            </Field>
          </div>
        </FormSection>

        {/* Pricing */}
        <FormSection title="💰  Pricing" delay={0.15}>
          <Field label="Price (ALGO)">
            <input
              value={form.price}
              onChange={e => set('price', e.target.value)}
              type="number" min="1" step="0.5"
              placeholder="e.g. 5"
              className="input-dark"
            />
          </Field>

          <AnimatePresence>
            {inr && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center justify-between bg-obsidian-4
                           border border-gold/20 rounded-xl px-5 py-3"
              >
                <div>
                  <div className="text-xs font-mono text-ink-3">Buyer pays</div>
                  <div className="font-display font-bold text-2xl text-gold">{price.toFixed(2)} ALGO</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-ink-3">≈ Indian Rupees</div>
                  <div className="font-display text-xl text-ink-1">₹{inr.toLocaleString()}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </FormSection>

        {/* Eco Impact */}
        <FormSection title="🌱  Sustainability Impact" delay={0.2}>
          <AnimatePresence mode="wait">
            {co2 ? (
              <motion.div
                key={form.category}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-4 bg-obsidian-4 border border-acid/20
                           rounded-xl px-5 py-4"
              >
                <div className="text-4xl">🌿</div>
                <div className="flex-1">
                  <div className="font-mono text-xs text-acid uppercase tracking-widest mb-1">
                    CO₂ Saved Per Trade
                  </div>
                  <div className="font-display font-bold text-2xl text-acid">
                    {(co2 / 1000).toFixed(1)} kg
                  </div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    +{pts} eco-points awarded on delivery confirmation
                  </div>
                </div>
                <Leaf className="text-acid/40" size={32} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 bg-obsidian-3 border border-white/6
                           rounded-xl px-5 py-4 text-ink-3 text-sm font-light"
              >
                <Info size={16} />
                Select a category to see your sustainability impact
              </motion.div>
            )}
          </AnimatePresence>
        </FormSection>

        {/* Blockchain info */}
        <FormSection title="⛓  Blockchain Escrow" delay={0.25}>
          <div className="space-y-2 text-sm text-ink-2 font-light leading-relaxed">
            {[
              ['Contract deploys on', 'Algorand Testnet (AVM v8)'],
              ['Finality time', '~2.78 seconds'],
              ['Seller receives', '99% of price (1% platform fee)'],
              ['Auto-refund if no confirm', '~55 minutes (1,000 rounds)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/4 pb-2">
                <span className="text-ink-3">{k}</span>
                <span className="font-mono text-xs text-cyan">{v}</span>
              </div>
            ))}
          </div>
        </FormSection>

        {/* Submit */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={submitting || done}
          className="w-full py-4 rounded-2xl font-display font-bold text-base
                     transition-all duration-300 flex items-center justify-center gap-3
                     disabled:opacity-60 disabled:cursor-not-allowed
                     bg-cyan text-obsidian hover:shadow-glow-cyan hover:-translate-y-0.5"
        >
          {done
            ? <><span className="text-xl">✅</span> Listed! Redirecting…</>
            : submitting
            ? <><Spinner /> Deploying Escrow Contract…</>
            : <><Zap size={18} /> Deploy Escrow & List Item</>
          }
        </motion.button>
      </div>
    </div>
  )
}

function FormSection({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass border border-white/6 rounded-2xl p-6"
    >
      <div className="font-display font-semibold text-base text-ink-1 mb-5 flex items-center gap-2">
        {title}
      </div>
      {children}
    </motion.div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-ink-3 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-dark appearance-none pr-10 cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
    </div>
  )
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className="w-5 h-5 border-2 border-obsidian/40 border-t-obsidian rounded-full"
    />
  )
}