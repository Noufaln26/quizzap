import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export const socket = io(SERVER_URL, {
  autoConnect: false,
  // Start with polling so connections work through cellular NAT, proxies, and
  // firewalls that block WebSocket upgrades; Socket.io will automatically
  // upgrade to WebSocket once the connection is established and stable.
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  // Allow more time between attempts to handle cellular network switches
  // (e.g. WiFi → 4G/5G handoff) which can take several seconds.
  reconnectionDelayMax: 10000,
})

// Reconnect when the device comes back online after losing connectivity.
// This covers switching between WiFi and cellular as well as full drops.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (!socket.connected) {
      socket.connect()
    }
  })

  // navigator.connection is available in Chrome/Android and fires when the
  // network type changes (e.g. WiFi → LTE), giving a chance to re-establish
  // a fresh connection instead of waiting for a timeout.
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (connection) {
    connection.addEventListener('change', () => {
      if (socket.connected) {
        socket.disconnect()
        socket.connect()
      }
    })
  }
}

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
