export interface PlatformSettings {
    // General & Platform
    platformName: string
    tagline: string
    supportEmail: string
    supportPhone: string
    defaultLanguage: string
    timezone: string
    maintenanceMode: boolean
    announcement: {
        enabled: boolean
        text: string
        badge: string
        linkUrl: string
    }
    // Courses & Curriculum
    passingGradePercent: number
    allowFreePreview: boolean
    autoIssueCertificates: boolean
    aiTutorEnabled: boolean
    maxVideoUploadMb: number
    // Pricing & Monetization
    proMonthlyPrice: number
    proYearlyPrice: number
    currency: string
    paymentGatewayMode: "sandbox" | "live"
    stripeEnabled: boolean
    razorpayEnabled: boolean
    allowDiscounts: boolean
    // Live Classroom
    defaultClassResolution: string
    defaultWhiteboardEnabled: boolean
    studentScreenShareAllowed: boolean
    chatModerationEnabled: boolean
    maxClassParticipants: number
    recordingRetentionDays: number
}

export const defaultSettings: PlatformSettings = {
    platformName: "aspirantbook",
    tagline: "Master high-demand tech skills with interactive coding courses & live mentorship.",
    supportEmail: "support@aspirantbook.com",
    supportPhone: "+1 (800) 555-0199",
    defaultLanguage: "English (US)",
    timezone: "Asia/Kolkata (IST)",
    maintenanceMode: false,
    announcement: {
        enabled: true,
        text: "🚀 New Generative AI & Python Career Tracks are now live! Enroll today to claim early-bird certification.",
        badge: "NEW RELEASE",
        linkUrl: "/courses",
    },
    passingGradePercent: 75,
    allowFreePreview: true,
    autoIssueCertificates: true,
    aiTutorEnabled: true,
    maxVideoUploadMb: 500,
    proMonthlyPrice: 9.99,
    proYearlyPrice: 99.00,
    currency: "USD ($)",
    paymentGatewayMode: "sandbox",
    stripeEnabled: true,
    razorpayEnabled: true,
    allowDiscounts: true,
    defaultClassResolution: "1080p",
    defaultWhiteboardEnabled: true,
    studentScreenShareAllowed: false,
    chatModerationEnabled: true,
    maxClassParticipants: 100,
    recordingRetentionDays: 60,
}
