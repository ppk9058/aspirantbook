import { RtcTokenBuilder, RtcRole } from "agora-token"

export function generateAgoraRtcToken({
  channelName,
  uid = 0,
  role = "subscriber",
  expireSeconds = 3600 * 4,
}: {
  channelName: string
  uid?: number | string
  role?: "publisher" | "subscriber"
  expireSeconds?: number
}): string | null {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    return null
  }

  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expireSeconds

  try {
    const numericUid = typeof uid === "number" ? uid : 0
    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    )
  } catch (error) {
    console.error("Error generating Agora RTC Token:", error)
    return null
  }
}
