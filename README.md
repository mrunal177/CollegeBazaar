# 🎓 CampusBazaar  
### A Secure & Sustainable Student Marketplace Powered by Algorand

CampusBazaar is a blockchain-based platform that enables safe, verified, and eco-friendly buying and selling among college students using escrow and reputation systems.

## 📌 Problem

Most student trading happens on WhatsApp and Facebook groups, which leads to:

- ❌ Payment fraud after shipping items
- ❌ Fake student identities
- ❌ No transaction accountability
- ❌ Repeated scams
- ❌ Unnecessary purchase of new items → environmental waste

There is no trusted platform built specifically for campus trade.


## 💡 Solution

CampusBazaar solves these problems by providing:

- ✅ Verified student onboarding
- ✅ Algorand-based escrow payments
- ✅ Transparent reputation system
- ✅ Secure in-app marketplace

This creates trust and promotes reuse among students.

## ✨ Features Implemented

- ✅ Student verification system  
- ✅ Item listing and browsing  
- ✅ Algorand escrow smart contracts  
- ✅ Secure payment flow  
- ✅ User reputation tracking  
- ✅ Responsive web interface  


## ⏳ Features Planned

- ⏳ In-app messaging  
- ⏳ Dispute resolution system  
- ⏳ Multi-campus support  
- ⏳ Admin verification dashboard  
- ⏳ Mobile application  


## 🏗 System Architecture

```plaintext
Frontend (React)
      ↓
Backend (Node.js + Express)
      ↓
Database (MongoDB)
      ↓
Algorand Blockchain
(Escrow + Reputation)
```

---

## 📁 Important Files for Review

Judges are encouraged to review the following:

- `smartcontracts/escrow.py` → Escrow logic  
- `smartcontracts/reputation.py` → Trust system  
- `backend/routes/payments.js` → Transaction APIs  
- `frontend/src/components/Checkout.jsx` → Purchase flow  

---

## ⚡ Why Algorand?

We chose Algorand because it offers:

- ⚡ Fast transaction finality (~2.8 seconds)
- 💰 Ultra-low transaction fees (~₹0.01)
- 🌱 Carbon-negative blockchain
- 🐍 Python-friendly smart contracts

This makes it ideal for student micro-transactions.

---

## 🌍 Impact

### Student Impact
- Reduced fraud
- Increased trust
- Lower expenses

### Environmental Impact
- Encourages reuse
- Reduces carbon emissions
- Promotes sustainability

---

## 🛠 How to Run Locally

### Prerequisites
- Node.js
- MongoDB
- Algorand SDK

### Installation

```bash
git clone https://github.com/mrunal177/CollegeBazaar.git
cd CollegeBazaar

# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm start
```

Configure `.env` file for Algorand wallet keys

## 🏁 Final Note

CampusBazaar demonstrates how blockchain can solve real-world problems by creating trust, transparency, and sustainability in student commerce.

Thank you for reviewing our project.
