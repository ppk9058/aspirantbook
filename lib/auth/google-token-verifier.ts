import * as jose from "jose";

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
  exp: number;
}

export interface VerifyGoogleTokenResult {
  valid: boolean;
  payload?: GoogleTokenPayload;
  error?: string;
  errorCode?: "NOT_CONFIGURED" | "INVALID_TOKEN" | "INVALID_ISSUER" | "INVALID_AUDIENCE" | "TOKEN_EXPIRED" | "EMAIL_NOT_VERIFIED";
}

let googleRemoteJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getGoogleJwks() {
  if (!googleRemoteJwks) {
    googleRemoteJwks = jose.createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs")
    );
  }
  return googleRemoteJwks;
}

export function getAllowedGoogleClientIds(): string[] {
  const envList = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "";
  return envList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function verifyGoogleIdToken(
  idToken: string,
  options?: {
    allowedAudiences?: string[];
    clockToleranceSecs?: number;
    testSigningKey?: jose.KeyLike | Uint8Array;
  }
): Promise<VerifyGoogleTokenResult> {
  try {
    const allowedAudiences =
      options?.allowedAudiences && options.allowedAudiences.length > 0
        ? options.allowedAudiences
        : getAllowedGoogleClientIds();

    if (allowedAudiences.length === 0) {
      return {
        valid: false,
        errorCode: "NOT_CONFIGURED",
        error: "Google authentication is not configured: missing GOOGLE_CLIENT_IDS",
      };
    }

    let payload: jose.JWTPayload;

    // Support test signing key for testing without live Google network calls
    const testSecret = process.env.GOOGLE_ID_TOKEN_TEST_SECRET;
    if (options?.testSigningKey) {
      const verified = await jose.jwtVerify(idToken, options.testSigningKey, {
        clockTolerance: options?.clockToleranceSecs ?? 5,
      });
      payload = verified.payload;
    } else if (testSecret && (process.env.APP_ENV === "test" || process.env.NODE_ENV === "test")) {
      const secretBytes = new TextEncoder().encode(testSecret);
      const verified = await jose.jwtVerify(idToken, secretBytes, {
        clockTolerance: options?.clockToleranceSecs ?? 5,
      });
      payload = verified.payload;
    } else {
      // Production Google verification via remote JWKS
      const verified = await jose.jwtVerify(idToken, getGoogleJwks(), {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: allowedAudiences,
        clockTolerance: options?.clockToleranceSecs ?? 5,
      });
      payload = verified.payload;
    }

    // Issuer verification
    const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      return { valid: false, errorCode: "INVALID_ISSUER", error: `Invalid issuer: ${payload.iss}` };
    }

    // Audience verification
    const tokenAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const audienceMatch = tokenAud.some((aud) => aud && allowedAudiences.includes(aud));
    if (!audienceMatch) {
      return {
        valid: false,
        errorCode: "INVALID_AUDIENCE",
        error: `Invalid audience: token aud ${JSON.stringify(payload.aud)} not in allowed list`,
      };
    }

    // Expiry check
    const nowSecs = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSecs - (options?.clockToleranceSecs ?? 5)) {
      return { valid: false, errorCode: "TOKEN_EXPIRED", error: "Token expired" };
    }

    // Email check
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email) {
      return { valid: false, errorCode: "INVALID_TOKEN", error: "Missing email in token payload" };
    }

    // Security: email_verified MUST be true
    const emailVerified =
      payload.email_verified === true ||
      payload.email_verified === "true";

    if (!emailVerified) {
      return {
        valid: false,
        errorCode: "EMAIL_NOT_VERIFIED",
        error: "EMAIL_NOT_VERIFIED: Account takeover protection requires email_verified=true from Google",
      };
    }

    return {
      valid: true,
      payload: {
        sub: payload.sub as string,
        email,
        email_verified: true,
        name: typeof payload.name === "string" ? payload.name : undefined,
        picture: typeof payload.picture === "string" ? payload.picture : undefined,
        aud: Array.isArray(payload.aud) ? payload.aud[0] : (payload.aud as string),
        iss: payload.iss,
        exp: payload.exp,
      },
    };
  } catch (err: any) {
    if (err?.code === "ERR_JWT_EXPIRED") {
      return { valid: false, errorCode: "TOKEN_EXPIRED", error: "Token expired" };
    }
    return {
      valid: false,
      errorCode: "INVALID_TOKEN",
      error: err?.message || "Invalid or unverified Google token",
    };
  }
}
