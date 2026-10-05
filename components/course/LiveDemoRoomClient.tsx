"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Video,
  Radio,
  Clock,
  Volume2,
  CheckCircle2,
  Send,
  MessageSquare,
  Sparkles,
  ArrowRight,
  User,
  Users,
  ChevronLeft,
  Gift,
  Play,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Star,
  Mic,
  MicOff,
  VideoOff,
  Hand,
  Columns2,
  UserX,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Layout,
} from "lucide-react"
import { formatUtcToIst } from "@/lib/demo/slot-utils"

interface LiveDemoRoomClientProps {
  course: {
    id: string
    slug: string
    title: string
    description?: string
    thumbnailUrl?: string | null
    price?: number | null
    originalPrice?: number | null
    discountPercent?: number | null
    technology?: string
  }
  slotId: string
  initialSlot?: any
  bookingId?: string | null
  userRole?: string
  isTestMode?: boolean
}

interface ChatMessage {
  id: string
  userId: string
  displayName: string
  role: string
  message: string
  isQuestion: boolean
  isPinned: boolean
  createdAt: string
}

export default function LiveDemoRoomClient({
  course,
  slotId,
  initialSlot,
  bookingId,
  userRole,
  isTestMode = false,
}: LiveDemoRoomClientProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const isTeacherOrAdmin =
    userRole === "TEACHER" ||
    userRole === "ADMIN" ||
    session?.user?.role === "TEACHER" ||
    session?.user?.role === "ADMIN"

  // ── Session state ─────────────────────────────────────────────────────────
  const [sessionState, setSessionState] = useState<"PRE_CLASS" | "LIVE" | "COMPLETED">(
    initialSlot?.status === "LIVE"
      ? "LIVE"
      : initialSlot?.status === "ENDED"
      ? "COMPLETED"
      : "PRE_CLASS"
  )
  const [slotData, setSlotData] = useState<any>(initialSlot || null)
  const [isJoinedStream, setIsJoinedStream] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [remoteUserCount, setRemoteUserCount] = useState(initialSlot?.bookingCount || 0)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [audioNeedsUserGesture, setAudioNeedsUserGesture] = useState(false)
  const [isTeacherPublishing, setIsTeacherPublishing] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [alreadyLiveError, setAlreadyLiveError] = useState(false)
  const [activeTab, setActiveTab] = useState<"doubts" | "notes" | "students">("doubts")
  const [audioTesting, setAudioTesting] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(300)

  // ── Stage and Presence state ──────────────────────────────────────────────
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isTogglingHand, setIsTogglingHand] = useState(false)
  const [isOnStage, setIsOnStage] = useState(false)
  const [isJoiningStage, setIsJoiningStage] = useState(false)
  const [isLeavingStage, setIsLeavingStage] = useState(false)
  const [stageError, setStageError] = useState<string | null>(null)
  const [isStageStudentPublishing, setIsStageStudentPublishing] = useState(false)

  // Stage local tracks (for student on stage) & Uid tracking
  const stageLocalTracksRef = useRef<{ audio?: any; video?: any } | null>(null)
  const teacherUidRef = useRef<number | string | null>(null)
  const stageStudentUidRef = useRef<number | string | null>(null)

  // ── Screen Share State & Refs ─────────────────────────────────────────────
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isStartingScreenShare, setIsStartingScreenShare] = useState(false)
  const [showScreenShareWarningModal, setShowScreenShareWarningModal] = useState(false)
  const [shareTabAudio, setShareTabAudio] = useState(false)
  const [isScreenPublishing, setIsScreenPublishing] = useState(false)
  const [isSwappedLocally, setIsSwappedLocally] = useState(false)
  const [streamQuality, setStreamQuality] = useState<"HD" | "SD">("HD")

  const screenClientRef = useRef<any>(null)
  const screenTracksRef = useRef<{ video?: any; audio?: any } | null>(null)
  const remoteScreenTrackRef = useRef<any>(null)
  const remoteTeacherTrackRef = useRef<any>(null)
  const remoteStageTrackRef = useRef<any>(null)

  // ── Agora refs (single instance guard) ────────────────────────────────────
  // We use refs rather than state so we never re-create the manager on re-render.
  const agoraManagerRef = useRef<any>(null)
  // Map of uid -> IRemoteAudioTrack to prevent double-play
  const playingAudioTracksRef = useRef<Map<number | string, any>>(new Map())
  const isLeavingRef = useRef(false)

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputDoubt, setInputDoubt] = useState("")
  const [isSendingMsg, setIsSendingMsg] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const chatSinceRef = useRef<string>(new Date(0).toISOString())
  const chatPollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageReceivedAtRef = useRef<number>(Date.now())
  const chatListRef = useRef<HTMLDivElement | null>(null)
  const isTabVisibleRef = useRef(activeTab === "doubts")

  // watch tracker ref
  const watchTrackerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const effectivePrice = course.price || 1499
  const discountedPrice = Math.round(effectivePrice * 0.7) // 30% OFF

  // ── Session End ───────────────────────────────────────────────────────────
  const handleSessionEnd = useCallback(async () => {
    isLeavingRef.current = true
    if (agoraManagerRef.current) {
      await agoraManagerRef.current.leave()
      agoraManagerRef.current = null
    }
    playingAudioTracksRef.current.clear()
    setSessionState("COMPLETED")
    setIsJoinedStream(false)

    try {
      await fetch("/api/courses/demo/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: course.slug, courseId: course.id, slotId, bookingId }),
      })
    } catch (e) {
      console.error("Error finalizing demo attendance:", e)
    }
  }, [course.slug, course.id, slotId, bookingId])

  // ── 1. Status Polling (2s if stage activity or screen share, otherwise 5s) ──
  const hasStageActivity = Boolean(
    (slotData?.stageSessions && slotData.stageSessions.length > 0) ||
      slotData?.myStageSession ||
      slotData?.screenShareActive
  )

  useEffect(() => {
    let isMounted = true
    let pollTimeout: NodeJS.Timeout | null = null

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
        const data = await res.json()
        if (!isMounted || !data.success) return

        setSlotData(data)
        setIsReconnecting(data.isReconnecting || false)

        // Sync hand raise state if student
        if (!isTeacherOrAdmin && data.students) {
          const me = data.students.find((s: any) => s.userId === session?.user?.id)
          if (me) setIsHandRaised(Boolean(me.isHandRaised))
        }

        // Check if teacher changed controls or removed me from stage
        if (isOnStage && data.myStageSession) {
          if (data.myStageSession.status === "REMOVED" || data.myStageSession.status === "EXPIRED") {
            handleLeaveStage()
          } else {
            // Apply mute/video toggle from teacher
            if (stageLocalTracksRef.current?.audio) {
              stageLocalTracksRef.current.audio.setEnabled(!data.myStageSession.micMuted)
            }
            if (stageLocalTracksRef.current?.video) {
              stageLocalTracksRef.current.video.setEnabled(!data.myStageSession.videoOff)
            }
          }
        }

        if (data.status === "LIVE" && sessionState === "PRE_CLASS") {
          setSessionState("LIVE")
        } else if (data.status === "ENDED" && sessionState !== "COMPLETED") {
          handleSessionEnd()
        }
      } catch {
        // silent failover
      } finally {
        if (isMounted) {
          const delay = hasStageActivity ? 2000 : 5000
          pollTimeout = setTimeout(checkStatus, delay)
        }
      }
    }

    checkStatus()

    return () => {
      isMounted = false
      if (pollTimeout) clearTimeout(pollTimeout)
    }
  }, [slotId, sessionState, handleSessionEnd, hasStageActivity, isOnStage, isTeacherOrAdmin, session?.user?.id])

  // ── Departure Tracking (sendBeacon on pagehide / beforeunload) ─────────────
  useEffect(() => {
    const reportLeave = () => {
      if (slotId) {
        const payload = JSON.stringify({ slotId, bookingId })
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/courses/demo/leave", new Blob([payload], { type: "application/json" }))
        } else {
          fetch("/api/courses/demo/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {})
        }
      }
    }

    window.addEventListener("pagehide", reportLeave)
    window.addEventListener("beforeunload", reportLeave)

    return () => {
      window.removeEventListener("pagehide", reportLeave)
      window.removeEventListener("beforeunload", reportLeave)
      reportLeave()
    }
  }, [slotId, bookingId])

  // ── 2. Countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionState !== "PRE_CLASS") return
    if (slotData?.startTimeUtc) {
      const diff = Math.max(
        0,
        Math.floor((new Date(slotData.startTimeUtc).getTime() - Date.now()) / 1000)
      )
      setCountdownSeconds(diff)
    }
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [sessionState, slotData?.startTimeUtc])

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const remSecs = secs % 60
    if (hours > 0) return `${hours}h ${mins}m ${remSecs < 10 ? "0" : ""}${remSecs}s`
    return `${mins}m ${remSecs < 10 ? "0" : ""}${remSecs}s`
  }

  // ── 3. Watch Time Tracker ─────────────────────────────────────────────────
  useEffect(() => {
    if (isJoinedStream && !isTeacherOrAdmin) {
      watchTrackerRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/courses/demo/track-watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slotId, bookingId, deltaSeconds: 30 }),
          })
          const data = await res.json()
          if (data.pendingStageSession) {
            // Immediate status refresh if invited to stage
            fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
              .then((r) => r.json())
              .then((d) => { if (d.success) setSlotData(d) })
              .catch(() => {})
          }
        } catch {}
      }, 30000)
    }
    return () => {
      if (watchTrackerRef.current) {
        clearInterval(watchTrackerRef.current)
        watchTrackerRef.current = null
      }
    }
  }, [isJoinedStream, isTeacherOrAdmin, slotId, bookingId])

  // ── 4. Chat Polling (with tab visibility pause + 5s idle backoff) ─────────
  const pollChat = useCallback(async () => {
    // If browser tab is hidden in background, pause polling to save network and DB queries
    if (typeof document !== "undefined" && document.hidden) return

    try {
      const url = `/api/courses/demo/chat?slotId=${encodeURIComponent(slotId)}&since=${encodeURIComponent(chatSinceRef.current)}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      if (data.messages && data.messages.length > 0) {
        lastMessageReceivedAtRef.current = Date.now()
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id))
          if (newMsgs.length === 0) return prev
          // Update cursor to the latest message
          chatSinceRef.current = newMsgs[newMsgs.length - 1].createdAt
          // Count unread if tab is hidden
          if (!isTabVisibleRef.current) {
            setUnreadCount((c) => c + newMsgs.length)
          }
          const updated = [...prev, ...newMsgs]
          // Auto-scroll to bottom
          setTimeout(() => {
            chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" })
          }, 50)
          return updated
        })
      }
    } catch {}
  }, [slotId])

  useEffect(() => {
    // Poll chat as soon as we're in a live or completed session
    if (sessionState === "PRE_CLASS" && !isTeacherOrAdmin) return

    let isDisposed = false

    const scheduleNext = () => {
      if (isDisposed) return
      if (chatPollTimeoutRef.current) clearTimeout(chatPollTimeoutRef.current)
      if (typeof document !== "undefined" && document.hidden) return

      // Back off to 5s if no new messages received for > 60 seconds; otherwise 2s
      const idleTime = Date.now() - lastMessageReceivedAtRef.current
      const delay = idleTime > 60_000 ? 5000 : 2000

      chatPollTimeoutRef.current = setTimeout(async () => {
        if (isDisposed) return
        await pollChat()
        scheduleNext()
      }, delay)
    }

    // Initial poll
    pollChat().then(() => scheduleNext())

    // Pause when tab is hidden, resume immediately on visibility
    const handleVisibility = () => {
      if (typeof document === "undefined") return
      if (document.hidden) {
        if (chatPollTimeoutRef.current) clearTimeout(chatPollTimeoutRef.current)
      } else {
        lastMessageReceivedAtRef.current = Date.now()
        pollChat().then(() => scheduleNext())
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      isDisposed = true
      if (chatPollTimeoutRef.current) clearTimeout(chatPollTimeoutRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [sessionState, isTeacherOrAdmin, pollChat])

  // Keep tab-visible ref in sync
  useEffect(() => {
    isTabVisibleRef.current = activeTab === "doubts"
    if (activeTab === "doubts") setUnreadCount(0)
  }, [activeTab])

  // ── 5. Join as Audience ────────────────────────────────────────────────────
  const handleJoinLiveDemo = async () => {
    if (isConnecting || isJoinedStream) return
    if (agoraManagerRef.current) return // already initialized
    setIsConnecting(true)

    try {
      const tokenRes = await fetch(
        `/api/courses/demo/token?slotId=${encodeURIComponent(slotId)}${isTestMode ? "&testMode=true" : ""}`
      )
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || "Failed to retrieve Agora access token.")
      }

      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      AgoraRTC.setLogLevel(2)

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" })
      await client.setClientRole("audience")

      // ── Audio echo fix & Stage stream router: register handlers ONCE before join ──
      client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
        await client.subscribe(user, mediaType)

        if (mediaType === "video" && user.videoTrack) {
          if (user.uid === 888888) {
            // Screen share stream!
            remoteScreenTrackRef.current = user.videoTrack
            setIsScreenPublishing(true)
            setTimeout(() => attachVideoTracks(), 100)
          } else if (teacherUidRef.current === null || user.uid === teacherUidRef.current) {
            teacherUidRef.current = user.uid
            remoteTeacherTrackRef.current = user.videoTrack
            setIsTeacherPublishing(true)
            setTimeout(() => attachVideoTracks(), 100)
          } else {
            // Stage student stream!
            stageStudentUidRef.current = user.uid
            remoteStageTrackRef.current = user.videoTrack
            setIsStageStudentPublishing(true)
            setTimeout(() => attachVideoTracks(), 150)
          }
        }

        if (mediaType === "audio" && user.audioTrack) {
          // Exclude own screen client audio if teacher
          if (isTeacherOrAdmin && user.uid === 888888) return

          // Only play if NOT already playing for this uid
          if (!playingAudioTracksRef.current.has(user.uid)) {
            playingAudioTracksRef.current.set(user.uid, user.audioTrack)
            console.log(
              `[AudioTrack] Playing audio for uid=${user.uid}. Active audio tracks: ${playingAudioTracksRef.current.size}`
            )
            try {
              user.audioTrack.play()
            } catch {
              setAudioNeedsUserGesture(true)
            }
          }
        }
      })

      client.on("user-unpublished", (user: any, mediaType: "video" | "audio") => {
        if (mediaType === "video") {
          if (user.uid === 888888) {
            setIsScreenPublishing(false)
            remoteScreenTrackRef.current = null
            setTimeout(() => attachVideoTracks(), 100)
          }
          if (user.uid === teacherUidRef.current) {
            setIsTeacherPublishing(false)
            remoteTeacherTrackRef.current = null
            setTimeout(() => attachVideoTracks(), 100)
          }
          if (user.uid === stageStudentUidRef.current) {
            setIsStageStudentPublishing(false)
            remoteStageTrackRef.current = null
            setTimeout(() => attachVideoTracks(), 100)
          }
        }
        if (mediaType === "audio") {
          const track = playingAudioTracksRef.current.get(user.uid)
          if (track) {
            try { track.stop() } catch {}
            playingAudioTracksRef.current.delete(user.uid)
            console.log(
              `[AudioTrack] Stopped audio for uid=${user.uid}. Active audio tracks: ${playingAudioTracksRef.current.size}`
            )
          }
        }
      })

      client.on("user-left", (user: any) => {
        // Clean up stale audio tracks when user leaves entirely
        const track = playingAudioTracksRef.current.get(user.uid)
        if (track) {
          try { track.stop() } catch {}
          playingAudioTracksRef.current.delete(user.uid)
        }
        setRemoteUserCount((prev: number) => Math.max(0, prev - 1))
      })

      client.on("user-joined", () => {
        setRemoteUserCount((prev: number) => prev + 1)
      })

      client.on("token-privilege-will-expire", async () => {
        try {
          const refreshRes = await fetch(
            `/api/courses/demo/token?slotId=${encodeURIComponent(slotId)}${isTestMode ? "&testMode=true" : ""}`
          )
          const refreshData = await refreshRes.json()
          if (refreshData.token) await client.renewToken(refreshData.token)
        } catch {}
      })

      await client.join(tokenData.appId, tokenData.channelName, tokenData.token, null)
      agoraManagerRef.current = { client, leave: async () => { await client.leave() } }

      setIsJoinedStream(true)
      const effectiveBookingId = tokenData.bookingId || bookingId
      // Immediate presence registration
      fetch("/api/courses/demo/track-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, bookingId: effectiveBookingId, deltaSeconds: 0 }),
      }).catch(() => {})
    } catch (err: any) {
      console.error("Error joining live stream:", err)
      alert(err.message || "Failed to connect to the live stream. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  // ── 6. Teacher Go Live ─────────────────────────────────────────────────────
  const handleTeacherGoLive = async () => {
    if (isConnecting || agoraManagerRef.current) return
    setIsConnecting(true)
    setAlreadyLiveError(false)

    try {
      // Start slot in DB — returns 409 if another tab is already live
      const statusRes = await fetch("/api/courses/demo/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, action: "start" }),
      })
      const statusData = await statusRes.json()

      if (statusRes.status === 409) {
        setAlreadyLiveError(true)
        return
      }
      if (!statusRes.ok) {
        throw new Error(statusData.error || "Failed to start live session.")
      }

      setSessionState("LIVE")

      const tokenRes = await fetch(`/api/courses/demo/token?slotId=${encodeURIComponent(slotId)}`)
      const tokenData = await tokenRes.json()

      setPermissionError(null)

      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      AgoraRTC.setLogLevel(2)

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" })
      await client.setClientRole("host")

      client.on("user-joined", () => setRemoteUserCount((prev: number) => prev + 1))
      client.on("user-left", () => setRemoteUserCount((prev: number) => Math.max(0, prev - 1)))
      client.on("token-privilege-will-expire", async () => {
        try {
          const refreshRes = await fetch(`/api/courses/demo/token?slotId=${encodeURIComponent(slotId)}`)
          const refreshData = await refreshRes.json()
          if (refreshData.token) await client.renewToken(refreshData.token)
        } catch {}
      })

      await client.join(tokenData.appId, tokenData.channelName, tokenData.token, null)

      // Create mic (AEC/ANS/AGC) + camera tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: "speech_standard", AEC: true, ANS: true, AGC: true },
        { encoderConfig: "720p_1" }
      )

      // NEVER play localAudioTrack — would cause echo loop
      // Only play the video preview for teacher
      videoTrack.play("agora-video-container", { fit: "cover" })

      // Subscribe to on-stage student audio/video (exclude own screen UID 888888)
      client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
        if (user.uid === 888888) return // Teacher never subscribes to own screen share

        await client.subscribe(user, mediaType)

        if (mediaType === "video" && user.videoTrack) {
          stageStudentUidRef.current = user.uid
          remoteStageTrackRef.current = user.videoTrack
          setIsStageStudentPublishing(true)
          setTimeout(() => {
            attachVideoTracks()
          }, 150)
        }

        if (mediaType === "audio" && user.audioTrack) {
          if (!playingAudioTracksRef.current.has(user.uid)) {
            playingAudioTracksRef.current.set(user.uid, user.audioTrack)
            try { user.audioTrack.play() } catch {}
          }
        }
      })

      client.on("user-unpublished", (user: any, mediaType: "video" | "audio") => {
        if (user.uid === 888888) return
        if (mediaType === "video" && user.uid === stageStudentUidRef.current) {
          setIsStageStudentPublishing(false)
          remoteStageTrackRef.current = null
          setTimeout(() => attachVideoTracks(), 100)
        }
        if (mediaType === "audio") {
          const track = playingAudioTracksRef.current.get(user.uid)
          if (track) {
            try { track.stop() } catch {}
            playingAudioTracksRef.current.delete(user.uid)
          }
        }
      })

      await client.publish([audioTrack, videoTrack])

      agoraManagerRef.current = {
        client,
        localAudioTrack: audioTrack,
        localVideoTrack: videoTrack,
        leave: async () => {
          audioTrack.stop(); audioTrack.close()
          videoTrack.stop(); videoTrack.close()
          await client.leave()
        },
      }

      setIsJoinedStream(true)
      setIsTeacherPublishing(true)
    } catch (e: any) {
      console.error("Error going live as teacher:", e)
      const errorMsg = e.message || "Failed to start live broadcast."
      setPermissionError(errorMsg)
    } finally {
      setIsConnecting(false)
    }
  }

  // ── 7. Teacher Heartbeat ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTeacherOrAdmin || sessionState !== "LIVE") return
    const hb = setInterval(async () => {
      try {
        await fetch("/api/courses/demo/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId, action: "heartbeat" }),
        })
      } catch {}
    }, 15000)
    return () => clearInterval(hb)
  }, [isTeacherOrAdmin, sessionState, slotId])

  // ── 8. Teacher End Broadcast ───────────────────────────────────────────────
  const handleTeacherEndLive = async () => {
    const confirmEnd = window.confirm(
      "Are you sure you want to end this demo broadcast for all students?"
    )
    if (!confirmEnd) return
    try {
      await fetch("/api/courses/demo/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, action: "end" }),
      })
      await handleSessionEnd()
    } catch (e) {
      console.error(e)
    }
  }

  // ── 8b. Student Stage Actions ──────────────────────────────────────────────
  const handleToggleHandRaise = async () => {
    if (isTogglingHand) return
    setIsTogglingHand(true)
    try {
      const nextState = !isHandRaised
      const res = await fetch("/api/courses/demo/hand-raise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, raised: nextState }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsHandRaised(data.handRaised)
      }
    } catch {} finally {
      setIsTogglingHand(false)
    }
  }

  const handleAcceptAndJoinStage = async () => {
    const sessionToJoin = slotData?.myStageSession
    if (!sessionToJoin || isJoiningStage) return
    setIsJoiningStage(true)
    setStageError(null)

    try {
      // 1. Mark accepted
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", sessionId: sessionToJoin.id }),
      })

      // 2. Retrieve publisher token
      const tokenRes = await fetch("/api/courses/demo/stage/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, sessionId: sessionToJoin.id }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || "Failed to retrieve publisher stage token")
      }

      const client = agoraManagerRef.current?.client
      if (!client) throw new Error("Broadcast client not initialized")

      // 3. Switch role to host
      await client.setClientRole("host")

      // 4. Create tracks with AEC/ANS/AGC, video 360p ~400 kbps
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      let audioTrack: any = null
      let videoTrack: any = null
      const tracksToPublish: any[] = []

      if (sessionToJoin.mode === "AUDIO_ONLY") {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true,
          encoderConfig: "speech_standard",
        })
        tracksToPublish.push(audioTrack)
      } else {
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
          { AEC: true, ANS: true, AGC: true, encoderConfig: "speech_standard" },
          { encoderConfig: { width: 640, height: 360, frameRate: 15, bitrateMin: 200, bitrateMax: 400 } }
        )
        audioTrack = tracks[0]
        videoTrack = tracks[1]
        tracksToPublish.push(audioTrack, videoTrack)
      }

      // Publish tracks
      await client.publish(tracksToPublish)

      // Play local preview for stage video (never play local audio!)
      if (videoTrack) {
        setTimeout(() => {
          videoTrack.play("agora-stage-student-video", { fit: "cover" })
        }, 150)
      }

      stageLocalTracksRef.current = { audio: audioTrack, video: videoTrack }

      // 5. Notify server that student is ON_STAGE
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join-stage", sessionId: sessionToJoin.id }),
      })

      setIsOnStage(true)
      // Force status refresh
      fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setSlotData(d) })
        .catch(() => {})
    } catch (e: any) {
      console.error("Error joining stage:", e)
      setStageError(e.message || "Failed to access camera/microphone")
    } finally {
      setIsJoiningStage(false)
    }
  }

  const handleDeclineStageInvite = async () => {
    const sessionToDecline = slotData?.myStageSession
    if (!sessionToDecline) return
    try {
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", sessionId: sessionToDecline.id }),
      })
      setSlotData((prev: any) => ({ ...prev, myStageSession: null }))
    } catch {}
  }

  const handleLeaveStage = async () => {
    if (isLeavingStage) return
    setIsLeavingStage(true)
    try {
      const activeSession = slotData?.myStageSession
      // 1. Unpublish & close tracks (turns off camera/mic light immediately)
      if (stageLocalTracksRef.current) {
        const { audio, video } = stageLocalTracksRef.current
        if (agoraManagerRef.current?.client) {
          const tracks = [audio, video].filter(Boolean)
          if (tracks.length > 0) {
            await agoraManagerRef.current.client.unpublish(tracks).catch(() => {})
          }
        }
        if (audio) { audio.stop(); audio.close() }
        if (video) { video.stop(); video.close() }
        stageLocalTracksRef.current = null
      }

      // 2. Switch back to audience role
      if (agoraManagerRef.current?.client) {
        await agoraManagerRef.current.client.setClientRole("audience").catch(() => {})
      }

      // 3. Inform server
      if (activeSession) {
        await fetch("/api/courses/demo/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave-stage", sessionId: activeSession.id }),
        }).catch(() => {})
      }

      setIsOnStage(false)
      // Refresh status
      fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setSlotData(d) })
        .catch(() => {})
    } finally {
      setIsLeavingStage(false)
    }
  }

  // ── 8c. Teacher Stage Controls ─────────────────────────────────────────────
  const handleTeacherInviteToStage = async (studentId: string, mode: "AUDIO_ONLY" | "VIDEO_AUDIO") => {
    try {
      const res = await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", slotId, studentId, mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Failed to invite student to stage")
        return
      }
      // Instant refresh
      const statusRes = await fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
      const statusData = await statusRes.json()
      if (statusData.success) setSlotData(statusData)
    } catch {
      alert("Network error inviting student")
    }
  }

  const handleTeacherRemoveFromStage = async (sessionId: string) => {
    try {
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", sessionId }),
      })
      const statusRes = await fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
      const statusData = await statusRes.json()
      if (statusData.success) setSlotData(statusData)
    } catch {}
  }

  const handleTeacherControl = async (sessionId: string, micMuted?: boolean, videoOff?: boolean) => {
    try {
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "control", sessionId, micMuted, videoOff }),
      })
      const statusRes = await fetch(`/api/courses/demo/status?slotId=${encodeURIComponent(slotId)}`)
      const statusData = await statusRes.json()
      if (statusData.success) setSlotData(statusData)
    } catch {}
  }

  const handleToggleStageLayout = async (layout: "CORNER" | "SPLIT") => {
    try {
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "layout", slotId, stageLayout: layout }),
      })
      setSlotData((prev: any) => ({ ...prev, stageLayout: layout }))
    } catch {}
  }

  // ── 8c. Screen Sharing Controls & Multi-Track Video Routing ───────────────
  const attachVideoTracks = useCallback(() => {
    const isHost = isTeacherOrAdmin && isJoinedStream
    const screenActive = Boolean(slotData?.screenShareActive || isScreenSharing || isScreenPublishing)
    const currentLayout = slotData?.teacherLayout || (isScreenSharing ? "SCREEN_WITH_FACE_CORNER" : "FACE_ONLY")
    const isStagePresent = Boolean(
      isStageStudentPublishing || isOnStage || slotData?.stageSessions?.some((s: any) => s.status === "ON_STAGE")
    )

    // 1. Screen Track Routing
    if (screenActive) {
      if (isHost && screenTracksRef.current?.video) {
        try {
          screenTracksRef.current.video.play("agora-screen-container", { fit: "contain" })
        } catch {}
      } else if (remoteScreenTrackRef.current) {
        const screenTarget = isSwappedLocally ? "agora-teacher-face-container" : "agora-screen-container"
        const el = document.getElementById(screenTarget)
        if (el) {
          try {
            remoteScreenTrackRef.current.play(screenTarget, { fit: "contain" })
          } catch {}
        }
      }
    }

    // 2. Teacher Face Track Routing
    if (currentLayout !== "SCREEN_ONLY" || !screenActive) {
      const faceTarget = screenActive && !isSwappedLocally ? "agora-teacher-face-container" : "agora-video-container"
      if (isHost && agoraManagerRef.current?.localVideoTrack) {
        const el = document.getElementById(faceTarget)
        if (el) {
          try {
            agoraManagerRef.current.localVideoTrack.play(faceTarget, { fit: "cover" })
          } catch {}
        }
      } else if (remoteTeacherTrackRef.current) {
        const el = document.getElementById(faceTarget)
        if (el) {
          try {
            remoteTeacherTrackRef.current.play(faceTarget, { fit: "cover" })
          } catch {}
        }
      }
    }

    // 3. Stage Student Track Routing
    if (isStagePresent) {
      const el = document.getElementById("agora-stage-student-video")
      if (el) {
        if (isOnStage && stageLocalTracksRef.current?.video) {
          try {
            stageLocalTracksRef.current.video.play("agora-stage-student-video", { fit: "cover" })
          } catch {}
        } else if (remoteStageTrackRef.current) {
          try {
            remoteStageTrackRef.current.play("agora-stage-student-video", { fit: "cover" })
          } catch {}
        }
      }
    }
  }, [
    isTeacherOrAdmin,
    isJoinedStream,
    slotData?.screenShareActive,
    slotData?.teacherLayout,
    slotData?.stageSessions,
    isScreenSharing,
    isScreenPublishing,
    isStageStudentPublishing,
    isOnStage,
    isSwappedLocally,
  ])

  useEffect(() => {
    const t = setTimeout(() => {
      attachVideoTracks()
    }, 150)
    return () => clearTimeout(t)
  }, [
    slotData?.teacherLayout,
    slotData?.screenShareActive,
    slotData?.stageLayout,
    slotData?.facePosition,
    isScreenSharing,
    isScreenPublishing,
    isSwappedLocally,
    attachVideoTracks,
  ])

  const handleStartScreenShare = async () => {
    if (isStartingScreenShare || isScreenSharing) return
    setIsStartingScreenShare(true)
    try {
      const res = await fetch("/api/courses/demo/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          slotId,
          layout: "SCREEN_WITH_FACE_CORNER",
          facePosition: "top-right",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) {
        alert(data.error || "Failed to initialize screen sharing")
        setIsStartingScreenShare(false)
        return
      }

      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      AgoraRTC.setLogLevel(2)

      const screenTracks = await AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: {
            width: 1920,
            height: 1080,
            frameRate: 15,
            bitrateMin: 1200,
            bitrateMax: 2000,
          },
          optimizationMode: "detail",
        },
        shareTabAudio ? "auto" : "disable"
      )

      const [screenVideoTrack, screenAudioTrack] = Array.isArray(screenTracks)
        ? screenTracks
        : [screenTracks, null]

      // Native browser "Stop sharing" event listener
      screenVideoTrack.on("track-ended", () => {
        console.log("[ScreenShare] Native browser stop sharing triggered")
        handleStopScreenShare()
      })

      const screenClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" })
      await screenClient.setClientRole("host")
      try {
        await screenClient.enableDualStream()
      } catch {}

      await screenClient.join(data.appId, data.channelName, data.token, 888888)

      const toPublish: any[] = [screenVideoTrack]
      if (screenAudioTrack) toPublish.push(screenAudioTrack)
      await screenClient.publish(toPublish)

      screenClientRef.current = screenClient
      screenTracksRef.current = { video: screenVideoTrack, audio: screenAudioTrack }
      setIsScreenSharing(true)

      // Lower camera configuration to 360p while screen sharing
      if (agoraManagerRef.current?.localVideoTrack) {
        try {
          await agoraManagerRef.current.localVideoTrack.setEncoderConfiguration("360p_1")
        } catch {}
      }

      setSlotData((prev: any) => ({
        ...prev,
        screenShareActive: true,
        teacherLayout: "SCREEN_WITH_FACE_CORNER",
        facePosition: "top-right",
      }))

      setTimeout(() => {
        attachVideoTracks()
      }, 150)
    } catch (err: any) {
      console.error("[ScreenShare] Failed to start screen share:", err)
      if (err.name !== "NotAllowedError" && !err.message?.includes("Permission denied")) {
        alert("Could not start screen share: " + (err.message || "Unknown error"))
      }
    } finally {
      setIsStartingScreenShare(false)
      setShowScreenShareWarningModal(false)
    }
  }

  const handleStopScreenShare = async () => {
    setIsScreenSharing(false)
    if (screenTracksRef.current) {
      try {
        screenTracksRef.current.video?.stop()
        screenTracksRef.current.video?.close()
        screenTracksRef.current.audio?.stop()
        screenTracksRef.current.audio?.close()
      } catch {}
      screenTracksRef.current = null
    }
    if (screenClientRef.current) {
      try {
        await screenClientRef.current.leave()
      } catch {}
      screenClientRef.current = null
    }

    if (agoraManagerRef.current?.localVideoTrack) {
      try {
        await agoraManagerRef.current.localVideoTrack.setEncoderConfiguration("720p_1")
      } catch {}
    }

    try {
      await fetch("/api/courses/demo/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, action: "stop" }),
      })
    } catch {}

    setSlotData((prev: any) => ({
      ...prev,
      screenShareActive: false,
      teacherLayout: "FACE_ONLY",
    }))

    setTimeout(() => {
      attachVideoTracks()
    }, 150)
  }

  const handleTeacherChangeLayout = async (
    layout: "SCREEN_WITH_FACE_CORNER" | "SCREEN_ONLY" | "FACE_ONLY",
    pos?: string
  ) => {
    const newPos = pos || slotData?.facePosition || "top-right"
    setSlotData((prev: any) => ({
      ...prev,
      teacherLayout: layout,
      facePosition: newPos,
    }))
    try {
      await fetch("/api/courses/demo/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, action: "layout", layout, facePosition: newPos }),
      })
    } catch {}

    setTimeout(() => {
      attachVideoTracks()
    }, 150)
  }

  // ── 9. Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isLeavingRef.current = true
      if (agoraManagerRef.current) {
        agoraManagerRef.current.leave().catch(() => {})
        agoraManagerRef.current = null
      }
      if (screenTracksRef.current) {
        try {
          screenTracksRef.current.video?.stop()
          screenTracksRef.current.video?.close()
          screenTracksRef.current.audio?.stop()
          screenTracksRef.current.audio?.close()
        } catch {}
        screenTracksRef.current = null
      }
      if (screenClientRef.current) {
        screenClientRef.current.leave().catch(() => {})
        screenClientRef.current = null
      }
      if (stageLocalTracksRef.current) {
        stageLocalTracksRef.current.audio?.stop(); stageLocalTracksRef.current.audio?.close()
        stageLocalTracksRef.current.video?.stop(); stageLocalTracksRef.current.video?.close()
        stageLocalTracksRef.current = null
      }
      playingAudioTracksRef.current.forEach((track) => { try { track.stop() } catch {} })
      playingAudioTracksRef.current.clear()
      if (chatPollTimeoutRef.current) clearTimeout(chatPollTimeoutRef.current)
      if (watchTrackerRef.current) clearInterval(watchTrackerRef.current)
    }
  }, [])

  // ── iOS Unmute gesture ─────────────────────────────────────────────────────
  const handleUserUnmuteGesture = () => {
    playingAudioTracksRef.current.forEach((track) => {
      try { track.play() } catch {}
    })
    setAudioNeedsUserGesture(false)
  }

  // ── 10. Send Chat Message ──────────────────────────────────────────────────
  const handleSendDoubt = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputDoubt.trim()
    if (!trimmed || isSendingMsg) return
    if (trimmed.length > 300) {
      setChatError("Message is too long (max 300 chars)")
      return
    }
    setChatError(null)
    setIsSendingMsg(true)
    try {
      const res = await fetch("/api/courses/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, message: trimmed, isQuestion: !isTeacherOrAdmin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setChatError(data.error || "Failed to send message")
        return
      }
      setInputDoubt("")
      // Optimistically add the message
      if (data.message) {
        lastMessageReceivedAtRef.current = Date.now()
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.message.id)) return prev
          chatSinceRef.current = data.message.createdAt
          const updated = [...prev, data.message]
          setTimeout(() => {
            chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" })
          }, 50)
          return updated
        })
      }
    } catch {
      setChatError("Network error. Please try again.")
    } finally {
      setIsSendingMsg(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100dvh-64px)] flex flex-col bg-[#051322] text-white">
      {/* ── Top Header Bar ── */}
      <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between bg-[#081a2f]">
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${course.slug}`}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-extrabold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-md">
              {course.title}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-gray-300">
              Free Live Demo
            </span>
            {isTestMode && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/40">
                Preview Mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTeacherOrAdmin && sessionState === "LIVE" && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-lg font-black animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>YOU ARE LIVE (HOST)</span>
            </div>
          )}

          {isOnStage && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-600 text-white font-black text-xs animate-pulse shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>YOU ARE LIVE TO EVERYONE</span>
              </div>
              <button
                onClick={handleLeaveStage}
                disabled={isLeavingStage}
                className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <UserX className="w-3 h-3 text-red-400" />
                <span>{isLeavingStage ? "Leaving..." : "Leave Stage"}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isTeacherOrAdmin
                ? `${slotData?.onlineCount ?? 0} watching • ${slotData?.totalBooked ?? remoteUserCount} booked`
                : `${slotData?.onlineCount ?? 1} watching`}
            </span>
          </div>

          {isTeacherOrAdmin && (
            <div className="flex items-center gap-2">
              {sessionState === "PRE_CLASS" ? (
                <button
                  onClick={handleTeacherGoLive}
                  disabled={isConnecting}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                  <span>Go Live Now (Host)</span>
                </button>
              ) : sessionState === "LIVE" ? (
                <div className="flex items-center gap-2">
                  {/* Desktop Chrome Screen Share Button */}
                  <div className="hidden lg:flex items-center">
                    {!isScreenSharing ? (
                      <button
                        onClick={() => setShowScreenShareWarningModal(true)}
                        disabled={isStartingScreenShare}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isStartingScreenShare ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5" />
                        )}
                        <span>Share Screen</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopScreenShare}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
                      >
                        <MonitorOff className="w-3.5 h-3.5" />
                        <span>Stop Sharing</span>
                      </button>
                    )}
                  </div>

                  {/* Mobile note per product requirements */}
                  <span className="lg:hidden text-[10px] text-gray-400 italic">
                    Screen share: Desktop only
                  </span>

                  <button
                    onClick={handleTeacherEndLive}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    End Broadcast
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Already Live in Another Tab Error ── */}
      {alreadyLiveError && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Already live in another tab. Close this tab and use the other one.</span>
        </div>
      )}

      {/* ── Reconnecting Banner ── */}
      {isReconnecting && (
        <div className="bg-amber-500 text-gray-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Faculty is temporarily disconnected. Reconnecting live feed...</span>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left: Video Stage */}
        <div className="lg:col-span-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 bg-black/40">
          {/* Video Stage */}
          <div className="relative flex-1 min-h-[320px] sm:min-h-[440px] flex items-center justify-center overflow-hidden bg-radial from-[#08213e] to-[#040f1a]">
            {sessionState === "PRE_CLASS" ? (
              /* Pre-Class Lobby */
              <div className="p-6 text-center max-w-md mx-auto space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-emerald-400 tracking-widest">
                    Pre-Class Lobby
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Live Demo starts in {formatCountdown(countdownSeconds)}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Faculty ({slotData?.teacherName || "Host"}) is preparing the presentation. Keep this tab open.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400 animate-ping" />
                    Waiting for Faculty to go live…
                  </span>
                  <button
                    onClick={() => { setAudioTesting(true); setTimeout(() => setAudioTesting(false), 2000) }}
                    className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{audioTesting ? "Testing Audio… 🔊" : "Test Audio"}</span>
                  </button>
                </div>

                <button
                  disabled
                  className="w-full py-3.5 rounded-2xl bg-white/10 text-gray-400 font-extrabold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Demo Class (Waiting for Faculty)</span>
                </button>

                {isTeacherOrAdmin && (
                  <p className="text-[11px] text-amber-400 font-semibold">
                    💡 Teacher mode detected: Click <strong>"Go Live Now"</strong> in the top bar to start streaming!
                  </p>
                )}
              </div>
            ) : sessionState === "LIVE" ? (
              /* Live Broadcast */
              <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
                {/* ── BROADCAST LAYOUT ROUTING ── */}
                {Boolean(slotData?.screenShareActive || isScreenSharing || isScreenPublishing) ? (
                  /* ── SCREEN SHARE ACTIVE ── */
                  slotData?.stageLayout === "SPLIT" &&
                  (isStageStudentPublishing || isOnStage || slotData?.stageSessions?.some((s: any) => s.status === "ON_STAGE")) ? (
                    /* 3-Stream SPLIT: Screen on Left (or Top on Mobile), Face + Student on Right (or Bottom) */
                    <div className="w-full h-full flex flex-col sm:flex-row bg-black overflow-hidden">
                      {/* Screen Share (Large) */}
                      <div className="flex-1 sm:w-2/3 h-1/2 sm:h-full relative bg-black flex items-center justify-center border-b sm:border-b-0 sm:border-r border-white/10">
                        <div id="agora-screen-container" className="w-full h-full" />
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5">
                          <Monitor className="w-3 h-3 text-blue-400" />
                          <span>Screen Presentation</span>
                        </div>
                      </div>

                      {/* Stacked Right/Bottom: Teacher Face + Student */}
                      <div className="w-full sm:w-1/3 h-1/2 sm:h-full flex flex-row sm:flex-col bg-gray-950">
                        {/* Teacher Face */}
                        <div className="flex-1 relative border-r sm:border-r-0 sm:border-b border-white/10 flex items-center justify-center overflow-hidden">
                          <div id="agora-teacher-face-container" className="w-full h-full" />
                          <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Faculty ({slotData?.teacherName || "Host"})</span>
                          </div>
                        </div>

                        {/* Stage Student */}
                        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                          <div id="agora-stage-student-video" className="w-full h-full" />
                          <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>{slotData?.stageSessions?.find((s: any) => s.status === "ON_STAGE")?.displayName || (isOnStage ? "You" : "Student")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (slotData?.teacherLayout || (isScreenSharing ? "SCREEN_WITH_FACE_CORNER" : "FACE_ONLY")) === "SCREEN_ONLY" ? (
                    /* SCREEN ONLY MODE */
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      <div id="agora-screen-container" className="w-full h-full absolute inset-0 bg-black flex items-center justify-center" />
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5">
                        <Monitor className="w-3 h-3 text-blue-400" />
                        <span>Screen Presentation (Screen Only)</span>
                      </div>

                      {/* Stage student in corner if present */}
                      {(isStageStudentPublishing || isOnStage || slotData?.stageSessions?.some((s: any) => s.status === "ON_STAGE")) && (
                        <div className="absolute bottom-4 right-4 z-30 w-36 h-26 sm:w-52 sm:h-38 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black flex items-center justify-center">
                          <div id="agora-stage-student-video" className="w-full h-full" />
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[9px] sm:text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{slotData?.stageSessions?.find((s: any) => s.status === "ON_STAGE")?.displayName || (isOnStage ? "You" : "Student")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SCREEN WITH FACE CORNER MODE (Default) */
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      {/* Main Large Stream: Screen (or Face if student tapped to swap) */}
                      <div id={isSwappedLocally ? "agora-video-container" : "agora-screen-container"} className="w-full h-full absolute inset-0 bg-black flex items-center justify-center" />

                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5">
                        {isSwappedLocally ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Faculty (Enlarged)</span>
                          </>
                        ) : (
                          <>
                            <Monitor className="w-3 h-3 text-blue-400" />
                            <span>Screen Presentation</span>
                          </>
                        )}
                      </div>

                      {/* Small Corner Window: Faculty Face (or Screen if swapped) - Tap to Swap */}
                      <div
                        onClick={() => setIsSwappedLocally(!isSwappedLocally)}
                        className={`absolute ${
                          (slotData?.facePosition === "top-left"
                            ? "top-4 left-4"
                            : slotData?.facePosition === "bottom-left"
                            ? "bottom-4 left-4"
                            : slotData?.facePosition === "bottom-right"
                            ? "bottom-4 right-4"
                            : "top-4 right-4")
                        } z-30 w-[28%] max-w-[125px] aspect-video sm:w-52 sm:h-38 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-blue-400 shadow-2xl bg-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95`}
                        title="Tap to swap main and corner views"
                      >
                        <div id={isSwappedLocally ? "agora-screen-container" : "agora-teacher-face-container"} className="w-full h-full" />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] sm:text-[9px] font-bold text-blue-300 flex items-center gap-1">
                          <Maximize2 className="w-2.5 h-2.5" />
                          <span>{isSwappedLocally ? "Screen" : "Faculty"}</span>
                        </div>
                      </div>

                      {/* Stage Student in Bottom-Right Corner (Non-conflicting) */}
                      {(isStageStudentPublishing || isOnStage || slotData?.stageSessions?.some((s: any) => s.status === "ON_STAGE")) && (
                        <div className="absolute bottom-4 right-4 z-30 w-36 h-26 sm:w-52 sm:h-38 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black flex items-center justify-center">
                          <div id="agora-stage-student-video" className="w-full h-full" />
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[9px] sm:text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{slotData?.stageSessions?.find((s: any) => s.status === "ON_STAGE")?.displayName || (isOnStage ? "You" : "Student")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* ── NORMAL NON-SCREEN BROADCAST (FACE ONLY) ── */
                  slotData?.stageLayout === "SPLIT" &&
                  (isStageStudentPublishing || isOnStage || slotData?.stageSessions?.some((s: any) => s.status === "ON_STAGE")) ? (
                    <div className="w-full h-full flex flex-col sm:flex-row bg-black">
                      <div className="flex-1 h-1/2 sm:h-full relative border-b sm:border-b-0 sm:border-r border-white/10 bg-black flex items-center justify-center overflow-hidden">
                        <div id="agora-video-container" className="w-full h-full" />
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Faculty ({slotData?.teacherName || "Host"})</span>
                        </div>
                      </div>

                      <div className="flex-1 h-1/2 sm:h-full relative bg-gray-950 flex items-center justify-center overflow-hidden">
                        <div id="agora-stage-student-video" className="w-full h-full" />
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>{slotData?.stageSessions?.find((s: any) => s.status === "ON_STAGE")?.displayName || (isOnStage ? "You" : "Student")} (On Stage)</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      <div id="agora-video-container" className="w-full h-full absolute inset-0 bg-black flex items-center justify-center" />

                      {(isStageStudentPublishing || isOnStage || slotData?.stageSessions?.some((s: any) => s.status === "ON_STAGE")) && (
                        <div className="absolute bottom-4 right-4 z-30 w-44 h-32 sm:w-56 sm:h-40 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black flex items-center justify-center animate-in zoom-in-95">
                          <div id="agora-stage-student-video" className="w-full h-full" />
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{slotData?.stageSessions?.find((s: any) => s.status === "ON_STAGE")?.displayName || (isOnStage ? "You" : "Student")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}

                {isTeacherOrAdmin && isJoinedStream && (
                  <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/90 text-white text-xs font-black shadow-lg backdrop-blur-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    <span>YOU ARE LIVE • Broadcasting HD Stream</span>
                  </div>
                )}

                {permissionError && (
                  <div className="absolute top-16 left-4 right-4 z-30 p-3.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-xl border border-red-400 flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                      <span>{permissionError}</span>
                    </div>
                    <button
                      onClick={() => setPermissionError(null)}
                      className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-[11px] font-bold shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {audioNeedsUserGesture && (
                  <div className="absolute top-4 z-30">
                    <button
                      onClick={handleUserUnmuteGesture}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Tap to Unmute Audio 🔊</span>
                    </button>
                  </div>
                )}

                {!isJoinedStream && !isTeacherOrAdmin ? (
                  /* Join prompt when LIVE but not yet joined */
                  <div className="text-center p-6 space-y-3 z-20 bg-black/70 backdrop-blur-xs rounded-3xl border border-white/10 max-w-sm">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                    <h3 className="text-lg font-black text-white">Faculty is LIVE!</h3>
                    <p className="text-xs text-gray-300 max-w-xs mx-auto">
                      Click below to enter the live HD interactive video stream.
                    </p>
                    <button
                      onClick={handleJoinLiveDemo}
                      disabled={isConnecting}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      <span>{isConnecting ? "Connecting to Stream..." : "Join Live Demo (Green • Live)"}</span>
                    </button>
                  </div>
                ) : !isTeacherPublishing && !isTeacherOrAdmin && isJoinedStream ? (
                  <div className="z-10 text-center space-y-2">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                    <p className="text-xs text-gray-300 font-bold">Connecting to teacher's HD camera feed...</p>
                  </div>
                ) : null}
              </div>
            ) : (
              /* Demo Completed / Conversion Screen */
              <div className="p-6 text-center max-w-md mx-auto space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                    Session Completed
                  </span>
                  <h2 className="text-2xl font-black text-white">Demo Completed! 🎉</h2>
                  <p className="text-xs text-gray-300">
                    This course has been added to your <strong>My Batches (Demo Watched)</strong> section. Complete your enrollment with your exclusive demo discount.
                  </p>
                </div>

                {/* Course Enrollment Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">Special Enrollment Offer:</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-white font-black text-xs uppercase tracking-wider">
                      BATCH ENROLLMENT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-medium">
                      Full Syllabus Access
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-black text-white">₹{effectivePrice}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/checkout?courseId=${course.slug}`}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Enroll in Full Course Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Teacher Screen Share Layout Selector Bar */}
          {isTeacherOrAdmin && isScreenSharing && (
            <div className="p-2.5 bg-[#081a2f] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-bold flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                  <span>Teacher Layout:</span>
                </span>
                <div className="flex rounded-lg bg-white/10 p-0.5 border border-white/10">
                  <button
                    onClick={() => handleTeacherChangeLayout("SCREEN_WITH_FACE_CORNER")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      (slotData?.teacherLayout || "SCREEN_WITH_FACE_CORNER") === "SCREEN_WITH_FACE_CORNER"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Screen + Face
                  </button>
                  <button
                    onClick={() => handleTeacherChangeLayout("SCREEN_ONLY")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      slotData?.teacherLayout === "SCREEN_ONLY"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Screen Only
                  </button>
                  <button
                    onClick={() => handleTeacherChangeLayout("FACE_ONLY")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      slotData?.teacherLayout === "FACE_ONLY"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Face Only
                  </button>
                </div>
              </div>

              {(slotData?.teacherLayout || "SCREEN_WITH_FACE_CORNER") === "SCREEN_WITH_FACE_CORNER" && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">Face Corner:</span>
                  <select
                    value={slotData?.facePosition || "top-right"}
                    onChange={(e) => handleTeacherChangeLayout("SCREEN_WITH_FACE_CORNER", e.target.value)}
                    className="px-2.5 py-1 rounded-md bg-[#04101e] border border-white/20 text-white text-[11px] cursor-pointer"
                  >
                    <option value="top-right">Top-Right (Default)</option>
                    <option value="top-left">Top-Left</option>
                    <option value="bottom-left">Bottom-Left</option>
                    <option value="bottom-right">Bottom-Right</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Persistent Offer Banner & Hand Raise ── */}
          {!isTeacherOrAdmin && sessionState !== "COMPLETED" && (
            <div className="p-3 bg-gradient-to-r from-indigo-950 via-[#0a1f38] to-slate-900 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-gray-950 font-black text-[10px] uppercase tracking-wider">
                  DEMO OFFER
                </span>
                <p className="text-xs font-bold text-gray-200">
                  Enroll in <strong className="text-white">{course.title}</strong> to unlock full lectures & notes
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {sessionState === "LIVE" && !isOnStage && (
                  <button
                    onClick={handleToggleHandRaise}
                    disabled={isTogglingHand}
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isHandRaised
                        ? "bg-amber-500 text-gray-950 hover:bg-amber-400 shadow-md font-black animate-pulse"
                        : "bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20"
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>{isHandRaised ? "✋ Hand Raised" : "✋ Raise Hand"}</span>
                  </button>
                )}
                <Link
                  href={`/checkout?courseId=${course.slug}`}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md transition-all text-center cursor-pointer"
                >
                  Buy Now
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right: Chat Panel */}
        <div className="lg:col-span-4 flex flex-col h-[380px] lg:h-auto border-t lg:border-t-0 border-white/10 bg-[#081a2f]">
          {/* Panel Tabs */}
          <div className="h-11 border-b border-white/10 flex items-center px-2 bg-black/20 text-xs font-bold">
            <button
              onClick={() => setActiveTab("doubts")}
              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "doubts" ? "bg-white/10 text-emerald-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Chat</span>
              {unreadCount > 0 && activeTab !== "doubts" && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isTeacherOrAdmin && (
              <button
                onClick={() => setActiveTab("students")}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "students" ? "bg-white/10 text-emerald-400" : "text-gray-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Students ({slotData?.onlineCount ?? 0})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "notes" ? "bg-white/10 text-emerald-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Session Notes</span>
            </button>
          </div>

          {activeTab === "doubts" ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div
                ref={chatListRef}
                className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-[11px] text-center">
                      {sessionState === "PRE_CLASS"
                        ? "Chat opens when the demo starts."
                        : "No messages yet. Be the first to say hi! 👋"}
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.userId === session?.user?.id
                    const isTeacherMsg = m.role === "TEACHER" || m.role === "ADMIN"
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-2xl max-w-[88%] ${
                          isTeacherMsg
                            ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-100 ml-auto"
                            : isMe
                            ? "bg-blue-950/60 border border-blue-500/30 text-blue-100 ml-auto"
                            : "bg-white/5 border border-white/10 text-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span className="font-bold flex items-center gap-1">
                            {m.displayName}
                            {isTeacherMsg && (
                              <span className="px-1.5 rounded bg-emerald-500 text-black text-[9px] font-black uppercase">
                                Faculty
                              </span>
                            )}
                            {isMe && !isTeacherMsg && (
                              <span className="px-1.5 rounded bg-blue-500/30 text-blue-300 text-[9px] font-bold">
                                You
                              </span>
                            )}
                          </span>
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <p className="leading-snug">{m.message}</p>
                        {m.isQuestion && !isTeacherMsg && (
                          <span className="mt-1 inline-block text-[9px] text-amber-400 font-bold">
                            ❓ Question
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Chat Error */}
              {chatError && (
                <div className="px-3 pb-1 text-[11px] text-red-400 font-semibold">{chatError}</div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSendDoubt}
                className="p-2 border-t border-white/10 flex items-center gap-1.5 bg-black/30"
              >
                <input
                  type="text"
                  value={inputDoubt}
                  onChange={(e) => {
                    setInputDoubt(e.target.value)
                    if (chatError) setChatError(null)
                  }}
                  placeholder={
                    sessionState === "PRE_CLASS"
                      ? "Chat opens when demo starts..."
                      : isTeacherOrAdmin
                      ? "Reply to students..."
                      : "Ask a doubt or say hi..."
                  }
                  maxLength={300}
                  disabled={sessionState === "PRE_CLASS" && !isTeacherOrAdmin}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!inputDoubt.trim() || isSendingMsg || (sessionState === "PRE_CLASS" && !isTeacherOrAdmin)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-40"
                  title="Send"
                >
                  {isSendingMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>
          ) : activeTab === "students" && isTeacherOrAdmin ? (
            /* ── Students Tab for Teacher Studio ── */
            <div className="flex-1 flex flex-col min-h-0 bg-[#081a2f]">
              {/* Stage Layout Controls */}
              <div className="p-3 bg-black/30 border-b border-white/10 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stage Layout:</span>
                </span>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => handleToggleStageLayout("CORNER")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      (slotData?.stageLayout || "CORNER") === "CORNER"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Corner
                  </button>
                  <button
                    onClick={() => handleToggleStageLayout("SPLIT")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      slotData?.stageLayout === "SPLIT"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Split 50/50
                  </button>
                </div>
              </div>

              {/* Online Students List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                {(!slotData?.students || slotData.students.length === 0) ? (
                  <div className="text-center py-10 text-gray-400 space-y-1">
                    <Users className="w-8 h-8 opacity-40 mx-auto" />
                    <p className="font-bold">No students currently online</p>
                    <p className="text-[11px] text-gray-500">Students will appear here as they enter the classroom.</p>
                  </div>
                ) : (
                  slotData.students.map((st: any) => {
                    const onStage = st.stageSession?.status === "ON_STAGE"
                    const invited = st.stageSession?.status === "INVITED" || st.stageSession?.status === "ACCEPTED"

                    return (
                      <div
                        key={st.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          onStage
                            ? "bg-emerald-950/40 border-emerald-500/50 shadow-md"
                            : invited
                            ? "bg-amber-950/30 border-amber-500/40"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="font-bold text-white text-xs">{st.displayName}</span>
                            {st.isHandRaised && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30 animate-pulse flex items-center gap-1">
                                <Hand className="w-3 h-3" />
                                <span>Hand Raised</span>
                              </span>
                            )}
                          </div>

                          {onStage ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider">
                              On Stage
                            </span>
                          ) : invited ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 text-[10px] font-bold">
                              Invited...
                            </span>
                          ) : null}
                        </div>

                        {/* Action Controls */}
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          {onStage ? (
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleTeacherControl(st.stageSession.id, !st.stageSession.micMuted, undefined)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    st.stageSession.micMuted
                                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                                      : "bg-white/10 border-white/20 text-white"
                                  }`}
                                  title={st.stageSession.micMuted ? "Unmute Mic" : "Mute Mic"}
                                >
                                  {st.stageSession.micMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                                </button>
                                <button
                                  onClick={() => handleTeacherControl(st.stageSession.id, undefined, !st.stageSession.videoOff)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    st.stageSession.videoOff
                                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                                      : "bg-white/10 border-white/20 text-white"
                                  }`}
                                  title={st.stageSession.videoOff ? "Turn Video On" : "Turn Video Off"}
                                >
                                  {st.stageSession.videoOff ? <VideoOff className="w-3.5 h-3.5 text-red-400" /> : <Video className="w-3.5 h-3.5 text-emerald-400" />}
                                </button>
                              </div>

                              <button
                                onClick={() => handleTeacherRemoveFromStage(st.stageSession.id)}
                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          ) : invited ? (
                            <div className="flex items-center justify-between w-full text-[11px] text-gray-400">
                              <span>Waiting for student to accept...</span>
                              <button
                                onClick={() => handleTeacherRemoveFromStage(st.stageSession.id)}
                                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                onClick={() => handleTeacherInviteToStage(st.id, "AUDIO_ONLY")}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Mic className="w-3 h-3 text-cyan-400" />
                                <span>Audio only</span>
                              </button>
                              <button
                                onClick={() => handleTeacherInviteToStage(st.id, "VIDEO_AUDIO")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Video className="w-3 h-3" />
                                <span>Video+Audio</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            /* Notes Tab */
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs text-gray-300">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="font-bold text-white block">Key Topics Covered in Demo</span>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li>72nd BPSC Prelims syllabus structure and weightage</li>
                  <li>Current Affairs 12-month timeline and Bihar special highlights</li>
                  <li>How to read Economic Survey with minimum effort</li>
                  <li>Answer elimination techniques for tricky MCQs</li>
                </ul>
              </div>
              <p className="text-[11px] text-gray-400">
                Full lecture PDFs and mock tests will be accessible immediately upon full enrollment in this batch.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Student Stage Invite Modal ── */}
      {slotData?.myStageSession?.status === "INVITED" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#081a2f] border border-white/20 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">The teacher invited you on stage!</h3>
              <p className="text-xs text-gray-300 mt-1">
                {slotData.myStageSession.mode === "AUDIO_ONLY"
                  ? "Speak live with the faculty via audio."
                  : "Speak and show your camera feed live with the faculty."}
              </p>
              <p className="text-[11px] text-amber-300 font-semibold mt-2">
                🎧 We recommend using headphones for optimal sound quality without feedback.
              </p>
            </div>

            {stageError && (
              <div className="p-2 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/40">
                {stageError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDeclineStageInvite}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptAndJoinStage}
                disabled={isJoiningStage}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {isJoiningStage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                <span>Join Stage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Screen Share Confirmation / Safety Warning Modal ── */}
      {showScreenShareWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0b1e36] border border-blue-500/30 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Share Your Screen</h3>
                <p className="text-xs text-gray-400">Broadcast presentation window or desktop</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Privacy & Audio Notice:
              </p>
              <p className="text-[11px] leading-relaxed">
                Close private tabs, notifications, and chats. Students see what you share.
              </p>
              <p className="text-[11px] leading-relaxed text-amber-300">
                ⚠️ Tab audio plus mic can cause echo — <strong>using headphones is recommended</strong>.
              </p>
            </div>

            <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={shareTabAudio}
                onChange={(e) => setShareTabAudio(e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-200 font-medium">Share system / tab audio (if available)</span>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowScreenShareWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartScreenShare}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Select Window & Start</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
