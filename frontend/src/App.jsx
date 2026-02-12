import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import ParticleGrid from './components/ParticleGrid.jsx'
import Home from './pages/Home.jsx'
import Browse from './pages/Browse.jsx'
import Sell from './pages/Sell.jsx'
import Chat from './pages/Chat.jsx'
import Sustainability from './pages/Sustainability.jsx'
import Profile from './pages/Profile.jsx'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export default function App() {
  const location = useLocation()
  return (
    <div className="min-h-screen bg-obsidian relative noise">
      {/* Animated grid background */}
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none z-0" />
      {/* Particle canvas */}
      <ParticleGrid />
      {/* Radial glow at top */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px]
                      bg-glow-cyan opacity-40 pointer-events-none z-0 blur-3xl" />

      <Navbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative z-10 pt-16"
        >
          <Routes location={location}>
            <Route path="/"           element={<Home />} />
            <Route path="/browse"     element={<Browse />} />
            <Route path="/sell"       element={<Sell />} />
            <Route path="/chat"       element={<Chat />} />
            <Route path="/sustain"    element={<Sustainability />} />
            <Route path="/profile"    element={<Profile />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}