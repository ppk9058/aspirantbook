const COMMON_PASSWORDS = new Set([
    "12345678",
    "123456789",
    "1234567890",
    "password",
    "password1",
    "password123",
    "password1234",
    "admin123",
    "administrator",
    "qwerty123",
    "welcome123",
    "letmein123",
    "changeme123",
    "iloveyou",
    "secret123",
    "pass1234",
    "testing123",
    "student123",
    "aspirant123",
])

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
    if (!password || typeof password !== "string") {
        return { valid: false, error: "Password is required." }
    }

    if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters long." }
    }

    const lower = password.toLowerCase().trim()
    if (COMMON_PASSWORDS.has(lower)) {
        return { valid: false, error: "This password is too common or easily guessed. Please choose a stronger password." }
    }

    return { valid: true }
}
