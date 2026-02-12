import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ShoppingBag, Menu, X, Zap } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { to: '/',        label: 'Home' },
  { to: '/browse',  label: 'Browse' },
  { to: '/sell',    label: 'Sell' },
  { to: '/chat',    label: 'Chat' },
  { to: '/sustain', label: '🌱 Impact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <nav className="glass border-b border-white/5 flex items-center justify-between
                      px-6 h-16 max-w-screen-xl mx-auto">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan to-acid
                          flex items-center justify-center shadow-glow-cyan
                          group-hover:scale-110 transition-transform duration-200">
            <ShoppingBag size={15} className="text-obsidian" />
          </div>
          <span className="font-display font-bold text-lg text-ink-1 tracking-tight">
            Campus<span className="text-gradient-cyan">Bazaar</span>
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => clsx(
                'px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-150',
                isActive
                  ? 'text-cyan bg-cyan/10 border border-cyan/20'
                  : 'text-ink-2 hover:text-ink-1 hover:bg-white/4'
              )}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right: wallet + profile */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
                          border border-white/8 bg-obsidian-3
                          font-mono text-xs text-ink-2
                          hover:border-cyan/30 hover:text-cyan transition-all cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-acid animate-pulse-slow shadow-[0_0_6px_#39FF14]" />
            <span>Testnet</span>
            <span className="text-ink-3">|</span>
            <span>ABC1…XY23</span>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="btn-cyan text-sm py-2 px-5"
          >
            Profile
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-ink-2 hover:text-ink-1 transition-colors"
          onClick={() => setMobileOpen(v => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass border-b border-white/5 md:hidden px-6 pb-4"
          >
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => clsx(
                  'block px-4 py-3 rounded-lg text-sm font-body my-1 transition-all',
                  isActive ? 'text-cyan bg-cyan/10' : 'text-ink-2 hover:text-ink-1'
                )}
              >
                {label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}