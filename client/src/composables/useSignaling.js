// client/src/composables/useSignaling.js
//
// WebRTC Signaling Server for Earbuds Sync
// Handles connection establishment between host and listener devices
//
// In production, this would connect to a WebSocket/Socket.io server
// For demo purposes, uses localStorage with polling

import { ref } from 'vue'

export function useSignaling() {
  const isConnected = ref(false)
  const pendingOffers = ref(new Map())
  const pendingAnswers = ref(new Map())

  // ─────────────────────────────────────────────────────────────────────────────
  // Generate unique peer ID
  // ─────────────────────────────────────────────────────────────────────────────
  function generatePeerId() {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Send signaling message (WebRTC offer/answer/ICE candidates)
  // ─────────────────────────────────────────────────────────────────────────────
  async function sendSignalingMessage(peerId, message) {
    try {
      const signalingData = {
        from: getCurrentPeerId(),
        to: peerId,
        message,
        timestamp: Date.now(),
        expires: Date.now() + (30 * 1000) // 30 seconds
      }

      // Store in localStorage (demo implementation)
      const key = `signaling_${peerId}`
      localStorage.setItem(key, JSON.stringify(signalingData))

      // Also store in our pending messages for polling
      if (message.type === 'offer') {
        pendingOffers.value.set(peerId, signalingData)
      } else if (message.type === 'answer') {
        pendingAnswers.value.set(peerId, signalingData)
      }

      console.log('[Signaling] Sent message:', message.type, 'to', peerId)

    } catch (error) {
      console.error('[Signaling] Failed to send message:', error)
      throw error
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Receive signaling messages
  // ─────────────────────────────────────────────────────────────────────────────
  function pollSignalingMessages(peerId) {
    const key = `signaling_${getCurrentPeerId()}`
    const data = localStorage.getItem(key)

    if (!data) return null

    try {
      const message = JSON.parse(data)

      // Check if message is for us and not expired
      if (message.to === getCurrentPeerId() && Date.now() < message.expires) {
        // Remove from storage after reading
        localStorage.removeItem(key)
        console.log('[Signaling] Received message:', message.message.type, 'from', message.from)
        return message
      } else if (Date.now() >= message.expires) {
        // Clean up expired messages
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('[Signaling] Failed to parse message:', error)
      localStorage.removeItem(key)
    }

    return null
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Wait for signaling message with timeout
  // ─────────────────────────────────────────────────────────────────────────────
  async function waitForSignalingMessage(expectedType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const checkInterval = 500 // Check every 500ms

      const checkMessages = () => {
        const message = pollSignalingMessages(getCurrentPeerId())

        if (message && message.message.type === expectedType) {
          resolve(message)
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for ${expectedType}`))
          return
        }

        setTimeout(checkMessages, checkInterval)
      }

      checkMessages()
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Connection management
  // ─────────────────────────────────────────────────────────────────────────────
  function connect() {
    isConnected.value = true
    console.log('[Signaling] Connected to signaling server')
  }

  function disconnect() {
    isConnected.value = false
    pendingOffers.value.clear()
    pendingAnswers.value.clear()
    console.log('[Signaling] Disconnected from signaling server')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Peer ID management
  // ─────────────────────────────────────────────────────────────────────────────
  function getCurrentPeerId() {
    let peerId = sessionStorage.getItem('earbuds_peer_id')
    if (!peerId) {
      peerId = generatePeerId()
      sessionStorage.setItem('earbuds_peer_id', peerId)
    }
    return peerId
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Clean up expired messages
  // ─────────────────────────────────────────────────────────────────────────────
  function cleanup() {
    const now = Date.now()
    const keysToRemove = []

    // Check all signaling keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('signaling_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key))
          if (now >= data.expires) {
            keysToRemove.push(key)
          }
        } catch {
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))

    if (keysToRemove.length > 0) {
      console.log('[Signaling] Cleaned up', keysToRemove.length, 'expired messages')
    }
  }

  // Auto-cleanup on initialization
  cleanup()

  // Periodic cleanup
  setInterval(cleanup, 10000) // Every 10 seconds

  return {
    isConnected: readonly(isConnected),
    sendSignalingMessage,
    waitForSignalingMessage,
    connect,
    disconnect,
    getCurrentPeerId
  }
}