import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
})

// REST API helpers
export async function apiFetch(path, options = {}, adminPassword = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (adminPassword) headers['x-admin-password'] = adminPassword
  const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function uploadImage(file, adminPassword) {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${SERVER_URL}/upload`, {
    method: 'POST',
    headers: { 'x-admin-password': adminPassword },
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}
