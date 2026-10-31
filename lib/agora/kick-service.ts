/**
 * Agora Server-Side Kicking / Channel Ban Service
 * Uses Agora RESTful API: POST https://api.agora.io/dev/v1/kicking-rule
 * Requires AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET in environment variables.
 */

export async function kickUserFromAgoraChannel({
  channelName,
  uid,
  timeMinutes = 60,
}: {
  channelName: string
  uid: number | string
  timeMinutes?: number
}) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
  const customerId = process.env.AGORA_CUSTOMER_ID
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET

  if (!appId || !customerId || !customerSecret) {
    console.info(
      `[AgoraKick] Notice: AGORA_CUSTOMER_ID / AGORA_CUSTOMER_SECRET not configured. ` +
      `Stage removal relies on 3-minute token expiration and server-side 403 token denial for channel="${channelName}", uid=${uid}.`
    )
    return {
      success: false,
      reason: "AGORA_CUSTOMER_ID/SECRET not configured in environment.",
    }
  }

  const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString("base64")

  try {
    const res = await fetch("https://api.agora.io/dev/v1/kicking-rule", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appid: appId,
        cname: channelName,
        uid: Number(uid) || 0,
        time: timeMinutes,
        privileges: ["join_channel", "publish_audio", "publish_video"],
      }),
    })

    const data = await res.json()
    console.info(`[AgoraKick] Applied kicking rule for uid=${uid} in cname=${channelName}:`, data)
    return { success: res.ok, data }
  } catch (err: any) {
    console.error(`[AgoraKick] Error applying kicking rule:`, err)
    return { success: false, error: err.message }
  }
}
