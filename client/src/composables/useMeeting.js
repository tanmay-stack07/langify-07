// client/src/composables/useMeeting.js
//
// Meeting Mode composable for Langify.
// Connects to the server via Socket.IO and subscribes to a meeting room
// (keyed by sessionId). Receives real-time utterance broadcasts from the
// host's translation pipeline.
//
// Used by MeetingMode.vue — the read-only live caption viewer.

import { ref, readonly, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { API_BASE } from '@/config/api.js'

export function useMeeting() {
  // ── Reactive state ──────────────────────────────────────────────────────
  const connected = ref(false)
  const roomId = ref(null)
  const memberCount = ref(0)
  const utterances = ref([])
  const error = ref(null)

  let socket = null

  // ── Connect and join a room ─────────────────────────────────────────────
  function joinRoom(meetingRoomId, displayName = 'Viewer') {
    if (socket) leaveRoom() // Clean up any previous connection

    roomId.value = meetingRoomId
    error.value = null

    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      connected.value = true
      console.log('[Meeting] Connected to server, joining room:', meetingRoomId)
      socket.emit('meeting:join', {
        roomId: meetingRoomId,
        displayName,
      })
    })

    socket.on('disconnect', () => {
      connected.value = false
      console.log('[Meeting] Disconnected from server')
    })

    socket.on('connect_error', (err) => {
      error.value = `Connection failed: ${err.message}`
      console.error('[Meeting] Connection error:', err.message)
    })

    // Receive member count updates
    socket.on('meeting:member-update', ({ count }) => {
      memberCount.value = count
    })

    // Receive live utterances from the host
    socket.on('meeting:utterance', (utterance) => {
      utterances.value.unshift({
        id: crypto.randomUUID(),
        textOriginal: utterance.originalText,
        textTranslated: utterance.translatedText,
        detectedLanguage: utterance.detectedLanguage,
        confidence: utterance.confidence,
        emotionalTone: utterance.emotionalTone,
        alt1: utterance.alt_1,
        alt2: utterance.alt_2,
        timestamp: utterance.timestamp,
      })
    })
  }

  // ── Leave and disconnect ────────────────────────────────────────────────
  function leaveRoom() {
    if (socket) {
      if (roomId.value) {
        socket.emit('meeting:leave', { roomId: roomId.value })
      }
      socket.disconnect()
      socket = null
    }
    connected.value = false
    roomId.value = null
    memberCount.value = 0
    utterances.value = []
    error.value = null
  }

  // Auto-cleanup on component unmount
  onUnmounted(() => {
    leaveRoom()
  })

  return {
    connected: readonly(connected),
    roomId: readonly(roomId),
    memberCount: readonly(memberCount),
    utterances,
    error: readonly(error),
    joinRoom,
    leaveRoom,
  }
}
