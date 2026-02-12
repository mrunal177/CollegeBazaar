export const CO2_MAP = {
  books: 800, cycles: 30000, electronics: 15000,
  furniture: 12000, clothing: 2000, sports: 3000, other: 1000,
}

export const ECO_POINTS_MAP = {
  books: 20, cycles: 150, electronics: 80,
  furniture: 60, clothing: 15, sports: 25, other: 10,
}

export const ALGO_INR = 12.5

export const LISTINGS = [
  { id:'1', title:'DSP Textbook — Proakis (4th Ed)', category:'books', condition:'good', price:8, seller:'Rahul S.', rep:4.8, emoji:'📚', desc:'Used for 1 semester. Pencil marks only, all pages intact.' },
  { id:'2', title:'Hero Sprint Cycle 2023', category:'cycles', condition:'like_new', price:85, seller:'Priya M.', rep:5.0, emoji:'🚲', desc:'Barely used. Gears work perfectly. Lock included.' },
  { id:'3', title:'Casio FX-991EX Calculator', category:'electronics', condition:'new', price:12, seller:'Arjun K.', rep:4.5, emoji:'🧮', desc:'Bought extra — brand new, in original box.' },
  { id:'4', title:'Engineering Drawing Kit', category:'other', condition:'good', price:5, seller:'Sneha R.', rep:4.7, emoji:'📐', desc:'Full kit. Compass, set squares, mini drafter.' },
  { id:'5', title:'Thermodynamics — Cengel', category:'books', condition:'fair', price:6, seller:'Dev P.', rep:4.3, emoji:'📖', desc:'Good margin notes. Cover has tape on spine.' },
  { id:'6', title:'Study Table Lamp (LED)', category:'furniture', condition:'like_new', price:10, seller:'Ananya T.', rep:4.9, emoji:'💡', desc:'Warm + cool mode. USB port on base.' },
  { id:'7', title:'SG Players Cricket Bat', category:'sports', condition:'good', price:20, seller:'Vikram B.', rep:4.6, emoji:'🏏', desc:'Oiled and ready. Clean middle section.' },
  { id:'8', title:'Laptop Stand + Keyboard', category:'electronics', condition:'like_new', price:18, seller:'Tanya J.', rep:4.8, emoji:'💻', desc:'Aluminum stand + wireless keyboard. 3 months old.' },
]

export const LEADERBOARD = [
  { name:'Priya M.',  college:'VIT Pune', points:890, co2:48.2,  initial:'P', trades:16 },
  { name:'Rahul S.',  college:'VIT Pune', points:720, co2:31.5,  initial:'R', trades:12 },
  { name:'Arjun K.',  college:'VIT Pune', points:610, co2:28.3,  initial:'A', trades:10 },
  { name:'Sneha R.',  college:'VIT Pune', points:540, co2:22.1,  initial:'S', trades:9  },
  { name:'Dev P.',    college:'VIT Pune', points:480, co2:18.7,  initial:'D', trades:8  },
  { name:'Ananya T.', college:'VIT Pune', points:420, co2:16.2,  initial:'A', trades:7  },
]

export const CONDITION_META = {
  new:      { label:'New',       color:'text-acid  bg-acid/10  border-acid/25'  },
  like_new: { label:'Like New',  color:'text-cyan  bg-cyan/10  border-cyan/25'  },
  good:     { label:'Good',      color:'text-gold  bg-gold/10  border-gold/25'  },
  fair:     { label:'Fair',      color:'text-rose  bg-rose/10  border-rose/25'  },
}

export const CATEGORIES = [
  { id:'all',         label:'All',         emoji:'✦' },
  { id:'books',       label:'Books',       emoji:'📚' },
  { id:'cycles',      label:'Cycles',      emoji:'🚲' },
  { id:'electronics', label:'Electronics', emoji:'💻' },
  { id:'furniture',   label:'Furniture',   emoji:'🪑' },
  { id:'clothing',    label:'Clothing',    emoji:'👕' },
  { id:'sports',      label:'Sports',      emoji:'⚽' },
]