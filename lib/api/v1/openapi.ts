export function generateOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "AspirantBook Versioned Learner API",
      version: "1.0.0",
      description:
        "High-performance, secure, versioned JSON REST API for AspirantBook mobile applications and client integrations.",
      contact: {
        name: "AspirantBook Engineering",
        email: "contact.aspirantbook@gmail.com",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Current environment API v1 base",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your 15-minute access token obtained from /api/v1/auth/login",
        },
      },
      schemas: {
        StandardSuccessEnvelope: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: true },
            data: { type: "object" },
          },
          required: ["ok", "data"],
        },
        StandardErrorEnvelope: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Invalid request payload" },
                details: { type: "object" },
              },
              required: ["code", "message"],
            },
          },
          required: ["ok", "error"],
        },
      },
    },
    paths: {
      "/config": {
        get: {
          summary: "Get application runtime configuration & feature flags",
          tags: ["System"],
          responses: {
            "200": { description: "Current runtime configuration and reader app flags" },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Authenticate user using email and password",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    deviceName: { type: "string" },
                    platform: { type: "string", enum: ["android", "ios", "web"] },
                    appVersion: { type: "string" },
                  },
                  required: ["email", "password"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful with short-lived access token and refresh token" },
            "401": { description: "Invalid email or password" },
          },
        },
      },
      "/auth/register": {
        post: {
          summary: "Register new learner account with 13+ consent",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    phoneNumber: { type: "string" },
                    selectedGoal: { type: "string" },
                    consent: { type: "boolean", enum: [true] },
                    deviceName: { type: "string" },
                    platform: { type: "string", enum: ["android", "ios", "web"] },
                  },
                  required: ["name", "email", "password", "consent"],
                },
              },
            },
          },
          responses: {
            "201": { description: "Account created and session initialized" },
            "409": { description: "Email already registered" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          summary: "Rotate refresh token and issue new 15-minute access token",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    refreshToken: { type: "string" },
                  },
                  required: ["refreshToken"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Token rotated successfully" },
            "401": { description: "Invalid, expired, or reused refresh token (family revoked)" },
          },
        },
      },
      "/auth/logout": {
        post: {
          summary: "Revoke single device session",
          tags: ["Auth"],
          responses: { "200": { description: "Session revoked" } },
        },
      },
      "/auth/logout-all": {
        post: {
          summary: "Revoke all device sessions and bump session version",
          tags: ["Auth"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "All active sessions terminated" } },
        },
      },
      "/auth/sessions": {
        get: {
          summary: "List all active device sessions for current user",
          tags: ["Auth"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Active device session list" } },
        },
      },
      "/me": {
        get: {
          summary: "Fetch authenticated viewer profile, role, and entitlements",
          tags: ["Profile"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Profile details" } },
        },
        patch: {
          summary: "Update profile name, phone, goal, or avatar",
          tags: ["Profile"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Updated profile details" } },
        },
      },
      "/home": {
        get: {
          summary: "Dashboard home aggregate: streak, continue learning, upcoming tests",
          tags: ["Learner"],
          responses: { "200": { description: "Dashboard feed" } },
        },
      },
      "/goals": {
        get: {
          summary: "List examination goals and categories",
          tags: ["Learner"],
          responses: { "200": { description: "Available goals" } },
        },
      },
      "/tests": {
        get: {
          summary: "Paginated test series examination catalog",
          tags: ["Exam CBT"],
          parameters: [
            { name: "seriesId", in: "query", schema: { type: "string" } },
            { name: "goal", in: "query", schema: { type: "string" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", maximum: 50 } },
          ],
          responses: { "200": { description: "Test list" } },
        },
      },
      "/tests/{id}": {
        get: {
          summary: "Get test instructions and metadata",
          tags: ["Exam CBT"],
          responses: { "200": { description: "Test details" } },
        },
      },
      "/tests/{id}/attempts": {
        post: {
          summary: "Start new test attempt or resume active attempt",
          tags: ["Exam CBT"],
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Attempt initialized or resumed with server timer" } },
        },
      },
      "/attempts/{id}": {
        get: {
          summary: "Get attempt state and question list (answers hidden)",
          tags: ["Exam CBT"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Attempt questions and current selections" } },
        },
      },
      "/attempts/{id}/answers": {
        put: {
          summary: "Sync batched, sequence-numbered answers idempotently",
          tags: ["Exam CBT"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Answers persisted successfully" } },
        },
      },
      "/attempts/{id}/submit": {
        post: {
          summary: "Finalize attempt and authoritatively grade score",
          tags: ["Exam CBT"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Graded attempt results" } },
        },
      },
      "/attempts/{id}/result": {
        get: {
          summary: "Get scorecard, percentile, rank, and accuracy",
          tags: ["Exam CBT"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Final scorecard" } },
        },
      },
      "/attempts/{id}/solutions": {
        get: {
          summary: "Get full questions with correct answers and explanations (submitted only)",
          tags: ["Exam CBT"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Complete solutions with explanations" } },
        },
      },
      "/pyq/exams": {
        get: {
          summary: "List PYQ exam categories and paper counts",
          tags: ["PYQ"],
          responses: { "200": { description: "Exam categories" } },
        },
      },
      "/pyq/papers/{id}": {
        get: {
          summary: "Get PYQ paper metadata and sliced preview",
          tags: ["PYQ"],
          responses: { "200": { description: "Paper details with authwall preview slice" } },
        },
      },
      "/current-affairs": {
        get: {
          summary: "List current affairs monthly digests and quizzes",
          tags: ["Current Affairs"],
          responses: { "200": { description: "Monthly digests" } },
        },
      },
      "/tutorials": {
        get: {
          summary: "List read-only tutorial courses",
          tags: ["Tutorials"],
          responses: { "200": { description: "Tutorial catalogue" } },
        },
      },
      "/tutorials/{slug}/lessons/{id}": {
        get: {
          summary: "Get lesson content sliced by authwall server rules into Rosera JSON blocks",
          tags: ["Tutorials"],
          responses: { "200": { description: "Structured JSON blocks with preview metadata" } },
        },
      },
      "/library": {
        get: {
          summary: "Get owned/acquired eBook catalogue",
          tags: ["Library"],
          responses: { "200": { description: "Owned book items" } },
        },
      },
      "/library/{id}/file": {
        get: {
          summary: "Stream digital book PDF with HTTP Range (206) support",
          tags: ["Library"],
          responses: {
            "200": { description: "Full PDF binary stream" },
            "206": { description: "Partial byte range stream" },
          },
        },
      },
      "/notifications": {
        get: {
          summary: "List user notifications",
          tags: ["Notifications"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Notification items" } },
        },
      },
      "/devices": {
        post: {
          summary: "Register device push notification token",
          tags: ["Push Devices"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Token registered" } },
        },
        delete: {
          summary: "Unregister device push notification token",
          tags: ["Push Devices"],
          responses: { "200": { description: "Token removed" } },
        },
      },
    },
  };
}
