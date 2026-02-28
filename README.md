# ⚡ QuizZap

**Party quiz app. Lightning fast. 100% free to host.**

Real-time multiplayer quiz game built with React, Node.js, Socket.io, and Supabase. Players join from their phones using a PIN code. Host runs the game from a tablet or desktop.

---

## ✨ Features

- 🎮 Real-time multiplayer with 6-digit PIN (up to 10 players)
- 📱 Mobile-first player experience
- 🖥️ Tablet/desktop host dashboard
- ⚡ Speed-based scoring (base + speed bonus + streak bonus)
- 🔥 Streak bonuses for consecutive correct answers
- 🏆 Animated podium with top 3 winners
- 🖼️ Image support on questions
- ⏱️ Per-question timer (5/10/20/30s)
- 🔊 Sound effects throughout
- 🎨 Fun colorful Kahoot-style theme
- 🔐 Admin password for quiz creation

---

## 🗂️ Project Structure

```
quizzap/
├── server/          Node.js + Express + Socket.io
│   ├── index.js     Main server (API + game engine)
│   ├── schema.sql   Supabase database schema
│   └── .env.example Environment variables template
└── client/          React + Vite + TailwindCSS
    └── src/
        ├── pages/   All screens
        ├── components/
        └── lib/     Socket, sounds, confetti utilities
```

---

## 🚀 Deployment (100% Free)

### Step 1 — Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and paste the contents of `server/schema.sql` → Run
4. Go to **Storage** → Create bucket named `quiz-images` → Set to **Public**
5. Note your **Project URL** and **service_role key** (Settings → API)

### Step 2 — Deploy Backend to Railway

1. Create a free account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo → select the `server/` folder
3. Add environment variables:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   ADMIN_PASSWORD=choose_a_secret_password
   CLIENT_URL=https://your-vercel-app.vercel.app
   ```
4. Note your Railway app URL (e.g. `https://quizzap-server.up.railway.app`)

### Step 3 — Deploy Frontend to Vercel

1. Create a free account at [vercel.com](https://vercel.com)
2. Import GitHub repo → set **Root Directory** to `client/`
3. Add environment variables:
   ```
   VITE_SERVER_URL=https://your-railway-app.up.railway.app
   ```
4. Deploy — your app will be live at `https://quizzap.vercel.app` (or similar)

### Step 4 — Update CORS

Go back to Railway and update `CLIENT_URL` to your actual Vercel URL.

---

## 🏃 Local Development

### Server
```bash
cd server
cp .env.example .env   # Fill in your Supabase + admin password
npm install
npm run dev            # Runs on port 3001
```

### Client
```bash
cd client
echo "VITE_SERVER_URL=http://localhost:3001" > .env.local
npm install
npm run dev            # Runs on port 5173
```

---

## 🎮 How to Play

### Host
1. Go to your app URL on a desktop or tablet
2. Click **Host Game**
3. Select a quiz (create one first in Admin)
4. Share the 6-digit PIN with players
5. Click **Start Game** when everyone has joined
6. Click **Reveal Answer** after each question
7. Enjoy the podium! 🏆

### Players
1. Open the app on their phones
2. Click **Join Game**
3. Enter the PIN + a nickname
4. Wait for host to start
5. Tap answers as fast as possible!

### Create Quizzes
1. Click **Quiz Creator** on the home screen
2. Enter your admin password
3. Click **+ New Quiz**
4. Add questions, upload images, set timers, mark correct answers
5. Save — it's immediately available to host

---

## 📊 Scoring

| Component | Points |
|---|---|
| Correct answer | 1000 |
| Speed bonus | 0–500 (faster = more) |
| Streak x2 | +200 |
| Streak x3 | +300 |
| Streak x4+ | +500 (capped) |

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Real-time | Socket.io |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Image Storage | Supabase Storage |
| Audio | Web Audio API (synthesized) |
| Animations | CSS + Framer-compatible |
| Frontend host | Vercel (free) |
| Backend host | Railway (free) |
| DB host | Supabase (free) |

---

## 💰 Running Cost: $0

All services used are within their free tiers for small party games (up to 10 players).
