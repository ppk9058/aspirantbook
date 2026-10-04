/**
 * Agora WebRTC Client Wrapper for TrillionSkill Live Broadcasts
 * Supports Interactive Live Streaming (Broadcast Mode):
 * - Host (Teacher): Publishes video + audio + screen share
 * - Audience (Student): Subscribes to teacher video + audio (ultra-low latency, mobile-optimized)
 */

export interface AgoraConfig {
  appId: string
  channel: string
  token?: string | null
  uid?: string | number
}

export type AgoraRole = "host" | "audience"

export interface AgoraStreamCallbacks {
  onUserPublished?: (user: any, mediaType: "video" | "audio") => void
  onUserUnpublished?: (user: any, mediaType: "video" | "audio") => void
  onUserJoined?: (user: any) => void
  onUserLeft?: (user: any) => void
  onConnectionStateChanged?: (curState: string, revState: string, reason?: string) => void
  onTokenPrivilegeWillExpire?: () => void
  onError?: (error: any) => void
}

export class AgoraBroadcastManager {
  public client: any = null
  public localAudioTrack: any = null
  public localVideoTrack: any = null
  public screenTrack: any = null
  public isJoined: boolean = false
  public isSimulated: boolean = false
  private callbacks: AgoraStreamCallbacks = {}
  private config: AgoraConfig

  constructor(config: AgoraConfig, callbacks: AgoraStreamCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks
  }

  /**
   * Initialize and join the Agora channel
   */
  public async join(role: AgoraRole = "audience"): Promise<{ success: boolean; isSimulated: boolean }> {
    if (typeof window === "undefined") {
      return { success: false, isSimulated: false }
    }

    const appId = this.config.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID || ""

    if (!appId || appId === "YOUR_AGORA_APP_ID") {
      console.warn("Agora App ID not configured, using simulated preview mode.")
      this.isSimulated = true
      this.isJoined = true
      return { success: true, isSimulated: true }
    }

    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      AgoraRTC.setLogLevel(2) // Warning & errors only

      this.client = AgoraRTC.createClient({
        mode: "live",
        codec: "vp8",
      })

      // Set client role (host or audience)
      await this.client.setClientRole(role)

      // Listen for remote events
      this.client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
        await this.client.subscribe(user, mediaType)
        this.callbacks.onUserPublished?.(user, mediaType)
      })

      this.client.on("user-unpublished", (user: any, mediaType: "video" | "audio") => {
        this.callbacks.onUserUnpublished?.(user, mediaType)
      })

      this.client.on("user-joined", (user: any) => {
        this.callbacks.onUserJoined?.(user)
      })

      this.client.on("user-left", (user: any) => {
        this.callbacks.onUserLeft?.(user)
      })

      this.client.on("connection-state-change", (cur: string, rev: string, reason?: string) => {
        this.callbacks.onConnectionStateChanged?.(cur, rev, reason)
      })

      this.client.on("token-privilege-will-expire", () => {
        this.callbacks.onTokenPrivilegeWillExpire?.()
      })

      // Join the channel
      await this.client.join(
        appId,
        this.config.channel,
        this.config.token || null,
        this.config.uid || null
      )

      this.isJoined = true

      // If host, create and publish local camera + mic
      if (role === "host") {
        await this.publishLocalTracks()
      }

      return { success: true, isSimulated: false }
    } catch (err: any) {
      console.error("Agora live broadcast connection error:", err)
      throw err
    }
  }

  /**
   * Host only: Create and publish camera + mic
   */
  public async publishLocalTracks(): Promise<{ videoTrack: any; audioTrack: any }> {
    if (typeof window === "undefined" || this.isSimulated) return { videoTrack: null, audioTrack: null }

    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
    try {
      // AEC (echo cancellation) + ANS (noise suppression) + AGC (auto gain control)
      // are critical to prevent the teacher's own voice from echoing on student devices.
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          encoderConfig: "speech_standard",
          AEC: true,   // Acoustic Echo Cancellation
          ANS: true,   // Adaptive Noise Suppression
          AGC: true,   // Auto Gain Control
        },
        { encoderConfig: "720p_1" }
      )

      this.localAudioTrack = audioTrack
      this.localVideoTrack = videoTrack

      // IMPORTANT: Never call localAudioTrack.play() — this would feed the teacher's mic
      // back into their own speakers causing an echo loop. Only the video preview is played.

      if (this.client) {
        await this.client.publish([audioTrack, videoTrack])
      }

      return { videoTrack, audioTrack }

    } catch (err: any) {
      const msg = String(err?.message || err?.name || err || "")
      if (
        err?.name === "NotAllowedError" ||
        err?.code === "PERMISSION_DENIED" ||
        msg.includes("Permission denied") ||
        msg.includes("NotAllowedError")
      ) {
        throw new Error(
          "Camera or Microphone permission was denied. Please allow camera and microphone access in your browser address bar settings to broadcast the live demo."
        )
      } else if (
        err?.name === "NotFoundError" ||
        err?.code === "DEVICE_NOT_FOUND" ||
        msg.includes("NotFoundError")
      ) {
        throw new Error(
          "No camera or microphone found on your device. Please ensure a camera and microphone are connected."
        )
      }
      throw err
    }
  }

  /**
   * Play video track inside a DOM container ID
   */
  public playVideo(track: any, domElementId: string) {
    if (!track) return
    try {
      track.play(domElementId, { fit: "cover" })
    } catch (e) {
      console.warn("Error playing video track:", e)
    }
  }

  /**
   * Renew Agora token when nearing expiration
   */
  public async renewToken(newToken: string) {
    if (this.client && this.isJoined) {
      try {
        await this.client.renewToken(newToken)
      } catch (e) {
        console.error("Failed to renew Agora token:", e)
      }
    }
  }

  /**
   * Leave channel and cleanup tracks
   */
  public async leave() {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop()
        this.localAudioTrack.close()
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.stop()
        this.localVideoTrack.close()
      }
      if (this.screenTrack) {
        this.screenTrack.stop()
        this.screenTrack.close()
      }
      if (this.client && this.isJoined) {
        await this.client.leave()
      }
    } catch (e) {
      console.warn("Agora leave cleanup error:", e)
    } finally {
      this.isJoined = false
      this.client = null
    }
  }
}
