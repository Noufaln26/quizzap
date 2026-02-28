require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── In-Memory Game Rooms ────────────────────────────────────────────────────
// Map<pin, GameRoom>
const gameRooms = new Map();

function generatePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (gameRooms.has(pin));
  return pin;
}

function createRoom(pin, quiz, hostSocketId) {
  return {
    pin,
    quiz,
    hostSocketId,
    status: 'lobby', // lobby | question | reveal | leaderboard | ended
    currentQuestionIndex: -1,
    players: new Map(), // socketId -> { id, nickname, score, streak, answers }
    questionStartTime: null,
    answersReceived: new Map(), // socketId -> { optionIndex, timestamp }
    createdAt: Date.now(),
  };
}

function calcScore(room, socketId) {
  const player = room.players.get(socketId);
  const answer = room.answersReceived.get(socketId);
  if (!answer) return { points: 0, speedBonus: 0, streakBonus: 0 };

  const question = room.quiz.questions[room.currentQuestionIndex];
  const correct = question.answer_options.find((o) => o.is_correct);
  const isCorrect = answer.optionIndex === question.answer_options.indexOf(correct);

  if (!isCorrect) {
    player.streak = 0;
    return { points: 0, speedBonus: 0, streakBonus: 0, isCorrect: false };
  }

  const elapsed = answer.timestamp - room.questionStartTime;
  const timerMs = question.timer_seconds * 1000;
  const ratio = Math.max(0, 1 - elapsed / timerMs);
  const speedBonus = Math.round(500 * ratio);

  player.streak = (player.streak || 0) + 1;
  const streakBonus = Math.min(500, Math.max(0, (player.streak - 1) * 100));

  const points = 1000 + speedBonus + streakBonus;
  player.score = (player.score || 0) + points;

  return { points, speedBonus, streakBonus, isCorrect: true, streak: player.streak };
}

function getLeaderboard(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1, answers: undefined }));
}

// ─── REST API ────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Get all quizzes
app.get('/quizzes', async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, cover_image_url, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get single quiz with questions and options
app.get('/quizzes/:id', async (req, res) => {
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('*, questions(*, answer_options(*))')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });
  // Sort questions by order_index
  quiz.questions = (quiz.questions || []).sort((a, b) => a.order_index - b.order_index);
  res.json(quiz);
});

// Create quiz
app.post('/quizzes', adminAuth, async (req, res) => {
  const { title, description, cover_image_url, questions } = req.body;
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({ title, description, cover_image_url })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Insert questions
  if (questions && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { data: question, error: qErr } = await supabase
        .from('questions')
        .insert({
          quiz_id: quiz.id,
          question_text: q.question_text,
          image_url: q.image_url || null,
          timer_seconds: q.timer_seconds || 20,
          order_index: i,
        })
        .select()
        .single();
      if (qErr) continue;

      const opts = (q.answer_options || []).map((o) => ({
        question_id: question.id,
        text: o.text,
        color: o.color,
        is_correct: o.is_correct,
      }));
      if (opts.length > 0) {
        await supabase.from('answer_options').insert(opts);
      }
    }
  }

  res.status(201).json(quiz);
});

// Update quiz
app.put('/quizzes/:id', adminAuth, async (req, res) => {
  const { title, description, cover_image_url, questions } = req.body;
  const { error } = await supabase
    .from('quizzes')
    .update({ title, description, cover_image_url })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  if (questions) {
    // Delete existing questions/options (cascade)
    await supabase.from('questions').delete().eq('quiz_id', req.params.id);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { data: question } = await supabase
        .from('questions')
        .insert({
          quiz_id: req.params.id,
          question_text: q.question_text,
          image_url: q.image_url || null,
          timer_seconds: q.timer_seconds || 20,
          order_index: i,
        })
        .select()
        .single();
      if (!question) continue;
      const opts = (q.answer_options || []).map((o) => ({
        question_id: question.id,
        text: o.text,
        color: o.color,
        is_correct: o.is_correct,
      }));
      if (opts.length > 0) await supabase.from('answer_options').insert(opts);
    }
  }

  res.json({ ok: true });
});

// Delete quiz
app.delete('/quizzes/:id', adminAuth, async (req, res) => {
  await supabase.from('quizzes').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

// Image upload
app.post('/upload', adminAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const ext = req.file.mimetype.split('/')[1] || 'jpg';
  const filename = `${uuidv4()}.${ext}`;
  const { error } = await supabase.storage
    .from('quiz-images')
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype });
  if (error) return res.status(500).json({ error: error.message });
  const { data } = supabase.storage.from('quiz-images').getPublicUrl(filename);
  res.json({ url: data.publicUrl });
});

// ─── Socket.io Game Engine ───────────────────────────────────────────────────

io.on('connection', (socket) => {
  // HOST: Create game room
  socket.on('host:create-game', async ({ quizId }) => {
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*, questions(*, answer_options(*))')
      .eq('id', quizId)
      .single();
    if (error || !quiz) {
      socket.emit('error', { message: 'Quiz not found' });
      return;
    }
    quiz.questions = (quiz.questions || []).sort((a, b) => a.order_index - b.order_index);

    const pin = generatePin();
    const room = createRoom(pin, quiz, socket.id);
    gameRooms.set(pin, room);

    socket.join(`room:${pin}`);
    socket.emit('game:created', { pin, quizTitle: quiz.title, questionCount: quiz.questions.length });

    // Auto-cleanup after 2 hours
    setTimeout(() => gameRooms.delete(pin), 2 * 60 * 60 * 1000);
  });

  // PLAYER: Join game
  socket.on('player:join', ({ pin, nickname }) => {
    const room = gameRooms.get(pin);
    if (!room) { socket.emit('join:error', { message: 'Game not found. Check your PIN.' }); return; }
    if (room.status !== 'lobby') { socket.emit('join:error', { message: 'Game already started!' }); return; }
    if (room.players.size >= 10) { socket.emit('join:error', { message: 'Game is full (10 players max).' }); return; }

    // Check duplicate nickname
    const taken = [...room.players.values()].some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (taken) { socket.emit('join:error', { message: 'Nickname already taken!' }); return; }

    room.players.set(socket.id, { id: socket.id, nickname, score: 0, streak: 0 });
    socket.join(`room:${pin}`);
    socket.data.pin = pin;
    socket.data.nickname = nickname;

    socket.emit('join:success', { nickname, playerCount: room.players.size });
    // Notify host
    io.to(room.hostSocketId).emit('player:joined', {
      nickname,
      playerCount: room.players.size,
      players: [...room.players.values()].map((p) => ({ nickname: p.nickname })),
    });
  });

  // HOST: Start game
  socket.on('host:start-game', ({ pin }) => {
    const room = gameRooms.get(pin);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.players.size === 0) { socket.emit('error', { message: 'Need at least 1 player!' }); return; }
    room.status = 'active';
    io.to(`room:${pin}`).emit('game:started', { questionCount: room.quiz.questions.length });
  });

  // HOST: Next question
  socket.on('host:next-question', ({ pin }) => {
    const room = gameRooms.get(pin);
    if (!room || room.hostSocketId !== socket.id) return;

    room.currentQuestionIndex++;
    if (room.currentQuestionIndex >= room.quiz.questions.length) {
      // End game
      const leaderboard = getLeaderboard(room);
      room.status = 'ended';
      io.to(`room:${pin}`).emit('game:ended', { leaderboard });
      // Save scores to Supabase
      saveGameResults(room, pin);
      return;
    }

    const question = room.quiz.questions[room.currentQuestionIndex];
    room.answersReceived = new Map();
    room.status = 'question';
    room.questionStartTime = Date.now();

    const questionNumber = room.currentQuestionIndex + 1;
    const totalQuestions = room.quiz.questions.length;

    // Send to host (with correct answer index for display after reveal)
    const correctIndex = question.answer_options.findIndex((o) => o.is_correct);
    socket.emit('question:start', {
      questionNumber, totalQuestions,
      questionText: question.question_text,
      imageUrl: question.image_url,
      timerSeconds: question.timer_seconds,
      options: question.answer_options.map((o) => ({ text: o.text, color: o.color })),
      correctIndex,
      playerCount: room.players.size,
    });

    // Send to players (NO correct answer)
    socket.to(`room:${pin}`).emit('question:start', {
      questionNumber, totalQuestions,
      questionText: question.question_text,
      imageUrl: question.image_url,
      timerSeconds: question.timer_seconds,
      options: question.answer_options.map((o) => ({ text: o.text, color: o.color })),
    });
  });

  // PLAYER: Submit answer
  socket.on('player:answer', ({ pin, optionIndex }) => {
    const room = gameRooms.get(pin);
    if (!room || room.status !== 'question') return;
    if (room.answersReceived.has(socket.id)) return; // already answered

    room.answersReceived.set(socket.id, { optionIndex, timestamp: Date.now() });
    socket.emit('answer:received', { optionIndex });

    // Notify host of answer count
    io.to(room.hostSocketId).emit('answer:count', {
      count: room.answersReceived.size,
      total: room.players.size,
    });

    // Auto-reveal when everyone answered
    if (room.answersReceived.size === room.players.size) {
      triggerReveal(pin, room);
    }
  });

  // HOST: Reveal answer
  socket.on('host:reveal', ({ pin }) => {
    const room = gameRooms.get(pin);
    if (!room || room.hostSocketId !== socket.id) return;
    triggerReveal(pin, room);
  });

  // HOST: Show leaderboard
  socket.on('host:show-leaderboard', ({ pin }) => {
    const room = gameRooms.get(pin);
    if (!room || room.hostSocketId !== socket.id) return;
    room.status = 'leaderboard';
    const leaderboard = getLeaderboard(room);
    io.to(`room:${pin}`).emit('leaderboard:update', { leaderboard });
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const pin = socket.data.pin;
    if (!pin) return;
    const room = gameRooms.get(pin);
    if (!room) return;

    if (room.hostSocketId === socket.id) {
      io.to(`room:${pin}`).emit('host:disconnected');
      gameRooms.delete(pin);
    } else {
      const player = room.players.get(socket.id);
      if (player) {
        room.players.delete(socket.id);
        io.to(room.hostSocketId).emit('player:left', {
          nickname: player.nickname,
          playerCount: room.players.size,
        });
      }
    }
  });
});

function triggerReveal(pin, room) {
  if (room.status !== 'question') return;
  room.status = 'reveal';

  const question = room.quiz.questions[room.currentQuestionIndex];
  const correctIndex = question.answer_options.findIndex((o) => o.is_correct);

  // Count votes per option
  const voteCounts = question.answer_options.map(() => 0);
  room.answersReceived.forEach(({ optionIndex }) => {
    if (optionIndex >= 0 && optionIndex < voteCounts.length) voteCounts[optionIndex]++;
  });

  // Calc scores and send individual results to each player
  room.players.forEach((player, socketId) => {
    const result = calcScore(room, socketId);
    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      playerSocket.emit('answer:reveal', {
        correctIndex,
        isCorrect: result.isCorrect,
        points: result.points,
        speedBonus: result.speedBonus,
        streakBonus: result.streakBonus,
        streak: result.streak,
        totalScore: player.score,
      });
    }
  });

  // Send reveal to host with vote breakdown
  io.to(room.hostSocketId).emit('answer:reveal', {
    correctIndex,
    voteCounts,
    totalAnswered: room.answersReceived.size,
    totalPlayers: room.players.size,
  });
}

async function saveGameResults(room, pin) {
  try {
    const { data: session } = await supabase
      .from('game_sessions')
      .insert({ quiz_id: room.quiz.id, pin_code: pin, status: 'ended' })
      .select()
      .single();
    if (!session) return;
    const lb = getLeaderboard(room);
    const playerRows = lb.map((p) => ({
      session_id: session.id,
      nickname: p.nickname,
      total_score: p.score,
      final_rank: p.rank,
    }));
    await supabase.from('players').insert(playerRows);
  } catch (e) {
    // Non-critical
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`⚡ QuizZap server running on port ${PORT}`));
