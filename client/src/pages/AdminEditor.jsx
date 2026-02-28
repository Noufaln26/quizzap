import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, uploadImage } from '../lib/socket.js'

const COLORS = ['red', 'blue', 'yellow', 'green']
const COLOR_CLASSES = {
  red: 'bg-answer-red',
  blue: 'bg-answer-blue',
  yellow: 'bg-answer-yellow',
  green: 'bg-answer-green',
}

function emptyQuestion() {
  return {
    question_text: '',
    image_url: '',
    timer_seconds: 20,
    answer_options: [
      { text: '', color: 'red', is_correct: true },
      { text: '', color: 'blue', is_correct: false },
      { text: '', color: 'yellow', is_correct: false },
      { text: '', color: 'green', is_correct: false },
    ],
  }
}

export default function AdminEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const password = sessionStorage.getItem('quizzap-admin')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [activeQ, setActiveQ] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!password) { navigate('/admin'); return }
    if (!isNew) {
      apiFetch(`/quizzes/${id}`).then(q => {
        setTitle(q.title)
        setDescription(q.description || '')
        setCoverImageUrl(q.cover_image_url || '')
        if (q.questions && q.questions.length > 0) setQuestions(q.questions)
      })
    }
  }, [id, isNew, password, navigate])

  async function handleImageUpload(file, onUrl) {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadImage(file, password)
      onUrl(url)
    } catch (e) {
      alert('Image upload failed: ' + e.message)
    }
    setUploading(false)
  }

  function updateQuestion(index, field, value) {
    setQuestions(qs => qs.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  function updateOption(qIndex, oIndex, field, value) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIndex) return q
      const opts = q.answer_options.map((o, oi) => {
        if (field === 'is_correct') return { ...o, is_correct: oi === oIndex }
        return oi === oIndex ? { ...o, [field]: value } : o
      })
      return { ...q, answer_options: opts }
    }))
  }

  function addQuestion() {
    setQuestions(qs => [...qs, emptyQuestion()])
    setActiveQ(questions.length)
  }

  function removeQuestion(index) {
    if (questions.length === 1) return
    setQuestions(qs => qs.filter((_, i) => i !== index))
    setActiveQ(Math.max(0, index - 1))
  }

  async function handleSave() {
    if (!title.trim()) { alert('Quiz needs a title!'); return }
    if (questions.some(q => !q.question_text.trim())) { alert('All questions need text!'); return }
    if (questions.some(q => q.answer_options.some(o => !o.text.trim()))) { alert('All answer options need text!'); return }

    setSaving(true)
    try {
      const body = { title, description, cover_image_url: coverImageUrl, questions }
      if (isNew) {
        await apiFetch('/quizzes', { method: 'POST', body: JSON.stringify(body) }, password)
      } else {
        await apiFetch(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(body) }, password)
      }
      setSaved(true)
      setTimeout(() => navigate('/admin/dashboard'), 800)
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  const q = questions[activeQ]

  return (
    <div className="h-full bg-zap flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => navigate('/admin/dashboard')} className="text-white/50 text-xl px-2">←</button>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Quiz title..."
          className="flex-1 bg-transparent text-white font-display text-xl placeholder:text-white/30 focus:outline-none"
          style={{ fontSize: '20px' }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className={`font-display text-base px-4 py-2 rounded-xl active:scale-95 transition-all flex-shrink-0 ${saved ? 'bg-green-500 text-white' : 'bg-zap-yellow text-zap-purple'}`}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: question list */}
        <div className="w-16 md:w-48 border-r border-white/10 flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-2 space-y-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveQ(i)}
                className={`w-full rounded-xl p-2 font-display text-sm transition-all ${activeQ === i ? 'bg-zap-yellow text-zap-purple' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <span className="hidden md:block">Q{i + 1}</span>
                <span className="md:hidden">{i + 1}</span>
              </button>
            ))}
            <button
              onClick={addQuestion}
              className="w-full rounded-xl p-2 border-2 border-dashed border-white/20 text-white/40 font-display text-sm hover:border-zap-yellow hover:text-zap-yellow transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Question text */}
          <div>
            <label className="text-white/50 font-body text-xs uppercase tracking-widest mb-1 block">Question</label>
            <textarea
              value={q.question_text}
              onChange={e => updateQuestion(activeQ, 'question_text', e.target.value)}
              placeholder="Type your question here..."
              rows={3}
              className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-4 py-3 text-white font-body text-base placeholder:text-white/20 focus:outline-none focus:border-zap-yellow resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="text-white/50 font-body text-xs uppercase tracking-widest mb-1 block">Image (optional)</label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept="image/*"
                id={`img-${activeQ}`}
                className="hidden"
                onChange={e => handleImageUpload(e.target.files[0], url => updateQuestion(activeQ, 'image_url', url))}
              />
              <label
                htmlFor={`img-${activeQ}`}
                className="bg-white/10 border-2 border-white/20 rounded-xl px-4 py-2 text-white/60 font-body text-sm cursor-pointer hover:border-zap-yellow transition-colors"
              >
                {uploading ? '⏳ Uploading...' : '📷 Upload Image'}
              </label>
              {q.image_url && (
                <>
                  <img src={q.image_url} alt="" className="h-12 w-16 rounded-xl object-cover" />
                  <button onClick={() => updateQuestion(activeQ, 'image_url', '')} className="text-red-400 text-sm">✕</button>
                </>
              )}
            </div>
          </div>

          {/* Timer */}
          <div>
            <label className="text-white/50 font-body text-xs uppercase tracking-widest mb-1 block">Timer</label>
            <div className="flex gap-2">
              {[5, 10, 20, 30].map(t => (
                <button
                  key={t}
                  onClick={() => updateQuestion(activeQ, 'timer_seconds', t)}
                  className={`flex-1 py-2 rounded-xl font-display text-base transition-all ${q.timer_seconds === t ? 'bg-zap-yellow text-zap-purple' : 'bg-white/10 text-white'}`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* Answer options */}
          <div>
            <label className="text-white/50 font-body text-xs uppercase tracking-widest mb-2 block">Answers — tap to mark correct</label>
            <div className="grid grid-cols-1 gap-3">
              {q.answer_options.map((opt, oi) => (
                <div
                  key={oi}
                  className={`${COLOR_CLASSES[opt.color]} rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all ${opt.is_correct ? 'ring-4 ring-white' : 'opacity-80'}`}
                  onClick={() => updateOption(activeQ, oi, 'is_correct', true)}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0">
                    {opt.is_correct && <div className="w-3 h-3 rounded-full bg-white" />}
                  </div>
                  <input
                    value={opt.text}
                    onChange={e => { e.stopPropagation(); updateOption(activeQ, oi, 'text', e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    placeholder={`Answer ${oi + 1}...`}
                    className="flex-1 bg-transparent text-white font-body font-bold text-base placeholder:text-white/40 focus:outline-none"
                    style={{ fontSize: '16px' }}
                  />
                  {opt.is_correct && <span className="text-white text-sm font-body font-bold">✓ Correct</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Remove question */}
          {questions.length > 1 && (
            <button
              onClick={() => removeQuestion(activeQ)}
              className="w-full py-3 rounded-xl border-2 border-red-500/30 text-red-400 font-body text-sm active:scale-95 transition-transform"
            >
              🗑 Remove this question
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
