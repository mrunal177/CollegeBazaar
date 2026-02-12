import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, DollarSign, MessageCircle } from 'lucide-react'
import clsx from 'clsx'

const THREADS = [
  {
    id:'1', title:'DSP Textbook — Proakis', price:'8 ALGO', emoji:'📚',
    messages:[
      { id:1, mine:false, text:"Hi! Is the textbook still available?",     time:'2:14 PM' },
      { id:2, mine:true,  text:"Yes! Great condition, just light pencil marks.", time:'2:16 PM' },
      { id:3, mine:false, offer:{ amount:'6.00', label:'Price Offer' },    time:'2:17 PM' },
      { id:4, mine:true,  text:"I can do 7 ALGO — that's my best!",        time:'2:19 PM' },
      { id:5, mine:false, text:"Deal! 7 ALGO. Meet at library today?",      time:'2:21 PM' },
    ],
  },
  {
    id:'2', title:'Hero Sprint Cycle 2023', price:'85 ALGO', emoji:'🚲',
    messages:[
      { id:1, mine:false, text:"Does the cycle come with a basket?",        time:'11:30 AM' },
      { id:2, mine:true,  text:"No basket, but includes original lock & key!", time:'11:32 AM' },
    ],
  },
  {
    id:'3', title:'Casio FX-991EX Calc',   price:'12 ALGO', emoji:'🧮',
    messages:[
      { id:1, mine:false, text:"Still sealed in the box?",                  time:'9:05 AM' },
      { id:2, mine:true,  text:"100% sealed, never opened.",                time:'9:07 AM' },
      { id:3, mine:false, text:"Perfect, I'll take it at asking price.",    time:'9:10 AM' },
    ],
  },
]

export default function Chat() {
  const [threads, setThreads]   = useState(THREADS)
  const [activeId, setActiveId] = useState('1')
  const [input, setInput]       = useState('')
  const [showOffer, setShowOffer] = useState(false)
  const [offerAmt, setOfferAmt]   = useState('')
  const messagesEndRef = useRef(null)

  const active = threads.find(t => t.id === activeId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [active?.messages])

  const sendMsg = (text, offer = null) => {
    if (!text && !offer) return
    const now = new Date()
    const time = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
    const msg  = offer
      ? { id: Date.now(), mine: true, offer:{ amount: parseFloat(offer).toFixed(2), label:'Your Offer' }, time }
      : { id: Date.now(), mine: true, text, time }
    setThreads(prev => prev.map(t =>
      t.id === activeId ? { ...t, messages: [...t.messages, msg] } : t
    ))
    setInput('')
    setOfferAmt('')
    setShowOffer(false)
  }

  return (
    <div className="h-[calc(100vh-64px)] flex max-w-screen-xl mx-auto overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-72 flex-shrink-0 border-r border-white/6 flex flex-col">
        <div className="px-5 py-4 border-b border-white/6">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-cyan" />
            <span className="font-display font-semibold text-base text-ink-1">Negotiations</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={clsx(
                'w-full text-left px-5 py-4 border-b border-white/4 transition-all duration-150',
                t.id === activeId
                  ? 'bg-cyan/8 border-l-2 border-l-cyan'
                  : 'hover:bg-obsidian-3 border-l-2 border-l-transparent'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
                <div className="min-w-0">
                  <div className="text-sm font-body font-medium text-ink-1 truncate">{t.title}</div>
                  <div className="text-xs text-ink-3 mt-0.5 truncate">
                    {t.messages[t.messages.length - 1]?.text?.slice(0,40) || 'Price offer made'}…
                  </div>
                  <div className="font-mono text-xs text-gold mt-1">{t.price}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat main ── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 glass">
          <div>
            <div className="font-display font-semibold text-ink-1">{active?.title}</div>
            <div className="text-xs text-ink-3 mt-0.5">
              Listed at <span className="text-gold font-mono">{active?.price}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOffer(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold/30
                         text-gold text-sm font-body hover:bg-gold/10 transition-all"
            >
              <DollarSign size={14} />
              Make Offer
            </button>
            <button className="btn-cyan text-sm py-2 px-4">Buy Now</button>
          </div>
        </div>

        {/* Offer input bar */}
        <AnimatePresence>
          {showOffer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 border-b border-white/6 bg-obsidian-3 flex items-center gap-3"
            >
              <DollarSign size={14} className="text-gold" />
              <span className="text-sm text-ink-2">Offer price (ALGO):</span>
              <input
                value={offerAmt}
                onChange={e => setOfferAmt(e.target.value)}
                placeholder="e.g. 7"
                type="number"
                className="bg-obsidian-4 border border-gold/30 rounded-lg px-3 py-1.5
                           text-sm text-ink-1 outline-none focus:border-gold/60 w-28 font-mono"
              />
              <button
                onClick={() => offerAmt && sendMsg(null, offerAmt)}
                className="bg-gold text-obsidian text-sm font-bold px-4 py-1.5 rounded-lg
                           hover:shadow-glow-gold transition-all"
              >
                Send
              </button>
              <button onClick={() => setShowOffer(false)} className="text-ink-3 hover:text-ink-1 text-xs ml-auto">
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {active?.messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={clsx('flex', msg.mine ? 'justify-end' : 'justify-start')}
            >
              {/* Avatar for theirs */}
              {!msg.mine && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan to-acid
                                flex items-center justify-center text-obsidian text-xs font-bold
                                mr-2 flex-shrink-0 mt-1">
                  S
                </div>
              )}

              <div className={clsx('max-w-[70%] flex flex-col', msg.mine ? 'items-end' : 'items-start')}>
                {msg.offer ? (
                  <div className="bg-obsidian-4 border border-gold/30 rounded-2xl
                                  rounded-br-sm px-5 py-3">
                    <div className="font-mono text-[0.65rem] text-gold uppercase tracking-widest mb-1">
                      💰 {msg.offer.label}
                    </div>
                    <div className="font-display font-bold text-xl text-gold">
                      {msg.offer.amount} ALGO
                    </div>
                  </div>
                ) : (
                  <div className={clsx(
                    'px-4 py-2.5 rounded-2xl text-sm font-light leading-relaxed',
                    msg.mine
                      ? 'bg-cyan text-obsidian font-medium rounded-br-sm'
                      : 'bg-obsidian-4 border border-white/8 text-ink-1 rounded-bl-sm'
                  )}>
                    {msg.text}
                  </div>
                )}
                <span className="text-[0.65rem] text-ink-3 mt-1 px-1 font-mono">{msg.time}</span>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/6 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-obsidian-3 border border-white/8
                          rounded-2xl px-4 py-3 focus-within:border-cyan/40
                          focus-within:shadow-[0_0_0_3px_rgba(0,212,255,0.08)] transition-all">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg(input)}
              placeholder="Ask about the item, negotiate…"
              className="flex-1 bg-transparent outline-none text-ink-1 text-sm font-body placeholder-ink-3"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMsg(input)}
            className="w-11 h-11 rounded-xl bg-cyan flex items-center justify-center
                       text-obsidian hover:shadow-glow-cyan transition-all flex-shrink-0"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </main>
    </div>
  )
}