import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, uploadImage } from '../lib/socket.js'

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

function duplicateQuestion(q) {
  return {
    ...q,
    question_text: q.question_text + ' (copy)',
    answer_options: q.answer_options.map(o => ({ ...o })),
  }
}

// ── JSON Import/Export Modal ─────────────────────────────────────────────────
function JsonModal({ questions, onClose, onImport }) {
  const [mode, setMode] = useState('export') // 'export' | 'import'
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const fileInputRef = useRef()

  // Clean export format — easy to read and edit
  const exportData = questions.map((q, i) => ({
    question_text: q.question_text,
    timer_seconds: q.timer_seconds,
    answer_options: q.answer_options.map(o => ({
      text: o.text,
      color: o.color,
      is_correct: o.is_correct,
    })),
  }))

  const exportString = JSON.stringify(exportData, null, 2)

  function handleCopy() {
    navigator.clipboard.writeText(exportString)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([exportString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quizzap-questions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImportText(ev.target.result)
    reader.readAsText(file)
  }

  function validateAndImport() {
    setImportError('')
    let parsed
    try {
      parsed = JSON.parse(importText)
    } catch {
      setImportError('Invalid JSON — check your formatting.')
      return
    }

    if (!Array.isArray(parsed)) {
      setImportError('JSON must be an array of questions [...] ')
      return
    }

    // Validate each question
    const errors = []
    parsed.forEach((q, i) => {
      if (!q.question_text?.trim()) errors.push(`Q${i + 1}: missing question_text`)
      if (!Array.isArray(q.answer_options) || q.answer_options.length !== 4)
        errors.push(`Q${i + 1}: must have exactly 4 answer_options`)
      else {
        const correctCount = q.answer_options.filter(o => o.is_correct).length
        if (correctCount !== 1) errors.push(`Q${i + 1}: exactly one answer must have is_correct: true`)
        q.answer_options.forEach((o, oi) => {
          if (!o.text?.trim()) errors.push(`Q${i + 1} option ${oi + 1}: missing text`)
        })
      }
    })

    if (errors.length > 0) {
      setImportError(errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''))
      return
    }

    // Normalize — fill missing fields with defaults
    const normalized = parsed.map(q => ({
      question_text: q.question_text,
      image_url: q.image_url || '',
      timer_seconds: q.timer_seconds || 20,
      answer_options: q.answer_options.map((o, i) => ({
        text: o.text,
        color: o.color || ['red', 'blue', 'yellow', 'green'][i],
        is_correct: !!o.is_correct,
      })),
    }))

    onImport(normalized)
    onClose()
  }

  const EXAMPLE = JSON.stringify([
    {
      question_text: "What is the capital of France?",
      timer_seconds: 20,
      answer_options: [
        { text: "Paris", color: "red", is_correct: true },
        { text: "London", color: "blue", is_correct: false },
        { text: "Berlin", color: "yellow", is_correct: false },
        { text: "Madrid", color: "green", is_correct: false }
      ]
    }
  ], null, 2)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zap-purple border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="font-display text-xl text-zap-yellow">📋 Import / Export</h2>
          <button onClick={onClose} className="text-white/40 text-2xl hover:text-white w-10 h-10 flex items-center justify-center active:scale-90">✕</button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setMode('export')}
            className={`flex-1 py-3 font-display text-base transition-all ${mode === 'export' ? 'text-zap-yellow border-b-2 border-zap-yellow' : 'text-white/40'}`}
          >
            ⬆️ Export
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-3 font-display text-base transition-all ${mode === 'import' ? 'text-zap-yellow border-b-2 border-zap-yellow' : 'text-white/40'}`}
          >
            ⬇️ Import
          </button>
        </div>

        {/* ── EXPORT MODE ── */}
        {mode === 'export' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex-shrink-0">
              <p className="text-white/60 font-body text-sm">
                Export your <span className="text-zap-yellow font-bold">{questions.length} question{questions.length !== 1 ? 's' : ''}</span> as JSON. Save it, edit it, or import it into another quiz.
              </p>
            </div>

            {/* JSON preview */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <pre className="bg-black/30 rounded-2xl p-4 text-green-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                {exportString}
              </pre>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-white/10 flex gap-3 flex-shrink-0">
              <button
                onClick={handleCopy}
                className={`flex-1 py-3 rounded-2xl font-display text-base transition-all ${copySuccess ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy JSON'}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 bg-zap-yellow text-zap-purple py-3 rounded-2xl font-display text-base active:scale-95 transition-transform"
              >
                ⬇️ Download
              </button>
            </div>
          </div>
        )}

        {/* ── IMPORT MODE ── */}
        {mode === 'import' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <p className="text-white/60 font-body text-sm mb-3">
                Paste JSON or upload a file. Questions will be <span className="text-zap-yellow font-bold">added</span> to your existing questions.
              </p>

              {/* Upload file button */}
              <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current.click()}
                className="w-full bg-white/10 border-2 border-dashed border-white/30 rounded-xl px-4 py-3 text-white/60 font-body text-sm hover:border-zap-yellow hover:text-zap-yellow transition-colors mb-3"
              >
                📁 Upload .json file
              </button>

              {/* Example toggle */}
              <details className="mb-3">
                <summary className="text-white/40 font-body text-xs cursor-pointer hover:text-white/70">
                  Show expected format example
                </summary>
                <pre className="mt-2 bg-black/30 rounded-xl p-3 text-green-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {EXAMPLE}
                </pre>
              </details>
            </div>

            {/* Paste area */}
            <div className="flex-1 overflow-hidden px-5 pb-2">
              <textarea
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportError('') }}
                placeholder={'Paste your JSON here...\n\n[\n  {\n    "question_text": "...",\n    ...\n  }\n]'}
                className="w-full h-full bg-black/30 border-2 border-white/20 rounded-2xl p-4 text-green-300 font-mono text-xs placeholder:text-white/20 focus:outline-none focus:border-zap-yellow resize-none"
                style={{ fontSize: '12px', minHeight: '120px' }}
              />
            </div>

            {/* Error */}
            {importError && (
              <div className="mx-5 mb-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3">
                <p className="text-red-300 font-body text-xs whitespace-pre-line">{importError}</p>
              </div>
            )}

            {/* Import button */}
            <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={validateAndImport}
                disabled={!importText.trim()}
                className="w-full bg-zap-yellow text-zap-purple font-display text-xl py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-40"
              >
                ⚡ Import Questions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Editor ──────────────────────────────────────────────────────────────
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
  const [showJson, setShowJson] = useState(false)

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

  function duplicateCurrentQuestion() {
    const dupe = duplicateQuestion(questions[activeQ])
    const newQs = [...questions]
    newQs.splice(activeQ + 1, 0, dupe)
    setQuestions(newQs)
    setActiveQ(activeQ + 1)
  }

  function removeQuestion(index) {
    if (questions.length === 1) return
    setQuestions(qs => qs.filter((_, i) => i !== index))
    setActiveQ(Math.max(0, index - 1))
  }

  function handleImport(newQs) {
    // Merge: drop empty placeholder if it's the only question
    const existing = questions.filter(q => q.question_text.trim() !== '')
    const merged = [...existing, ...newQs]
    setQuestions(merged.length > 0 ? merged : [emptyQuestion()])
    setActiveQ(existing.length > 0 ? existing.length : 0)
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

      {/* JSON Import/Export Modal */}
      {showJson && (
        <JsonModal
          questions={questions}
          onClose={() => setShowJson(false)}
          onImport={handleImport}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => navigate('/admin/dashboard')} className="text-white/50 text-xl px-2 flex-shrink-0">←</button>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Quiz title..."
          className="flex-1 bg-transparent text-white font-display text-xl placeholder:text-white/30 focus:outline-none min-w-0"
          style={{ fontSize: '20px' }}
        />
        {/* JSON button */}
        <button
          onClick={() => setShowJson(true)}
          className="bg-white/10 border border-white/20 text-white font-display text-sm px-3 py-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
          title="Import / Export JSON"
        >
          📋 JSON
        </button>
        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`font-display text-sm px-4 py-2 rounded-xl active:scale-95 transition-all flex-shrink-0 ${saved ? 'bg-green-500 text-white' : 'bg-zap-yellow text-zap-purple'}`}
        >
          {saved ? '✓' : saving ? '...' : 'Save'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-14 md:w-44 border-r border-white/10 flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-2 space-y-1.5">
            {questions.map((qItem, i) => (
              <button
                key={i}
                onClick={() => setActiveQ(i)}
                className={`w-full rounded-xl p-2 font-display text-sm transition-all text-left leading-tight ${activeQ === i ? 'bg-zap-yellow text-zap-purple' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <span className="hidden md:block truncate text-xs">
                  {qItem.question_text
                    ? qItem.question_text.slice(0, 22) + (qItem.question_text.length > 22 ? '…' : '')
                    : `Q${i + 1} (empty)`}
                </span>
                <span className="md:hidden">{i + 1}</span>
              </button>
            ))}
            <button
              onClick={addQuestion}
              className="w-full rounded-xl p-2 border-2 border-dashed border-white/20 text-white/40 font-display text-sm hover:border-zap-yellow hover:text-zap-yellow transition-all"
            >
              <span className="hidden md:block">+ Add blank</span>
              <span className="md:hidden">+</span>
            </button>
          </div>
        </div>

        {/* Main editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Question action bar */}
          <div className="flex items-center justify-between">
            <span className="text-white/40 font-body text-xs uppercase tracking-widest">
              Q{activeQ + 1} / {questions.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={duplicateCurrentQuestion}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 font-body text-sm active:scale-95 transition-all"
                title="Duplicate this question"
              >
                <span>⧉</span>
                <span className="hidden sm:inline">Duplicate</span>
              </button>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(activeQ)}
                  className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-2 font-body text-sm active:scale-95 transition-all"
                >
                  <span>🗑</span>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>

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
            <div className="flex gap-2 items-center flex-wrap">
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
                  <button onClick={() => updateQuestion(activeQ, 'image_url', '')} className="text-red-400 text-sm px-2">✕ Remove</button>
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
            <label className="text-white/50 font-body text-xs uppercase tracking-widest mb-2 block">
              Answers — tap tile to mark correct ✓
            </label>
            <div className="grid grid-cols-1 gap-3">
              {q.answer_options.map((opt, oi) => (
                <div
                  key={oi}
                  className={`${COLOR_CLASSES[opt.color]} rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all ${opt.is_correct ? 'ring-4 ring-white scale-[1.01]' : 'opacity-80'}`}
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
                  {opt.is_correct && (
                    <span className="text-white text-sm font-body font-bold flex-shrink-0">✓ Correct</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
