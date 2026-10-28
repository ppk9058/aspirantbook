# Running AspirantBook Mobile on a Physical Phone via Expo Go

This guide explains how any developer or repository owner can run and test **AspirantBook Mobile** on an Android phone or iPhone in 2 minutes using Expo Go and local Wi-Fi.

---

## 1. Prerequisites

1. **Expo Go Installed on Phone**:
   - **Android**: Install [Expo Go from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).
   - **iOS**: Install [Expo Go from Apple App Store](https://apps.apple.com/app/expo-go/id982107779).
2. **Same Local Wi-Fi Network**:
   - Your laptop and your phone must be connected to the same Wi-Fi network (or laptop personal hotspot).
3. **Docker Test Database**:
   - Ensure the Docker test database container is running:
     ```bash
     npm run test:db:up
     ```

---

## 2. One-Command Launch (`npm run dev:lan`)

In the repository root, run:

```bash
npm run dev:lan
```

### What This Command Automatically Does:
1. **Detects Your Machine's LAN IP**: Standard Node network inspection finds your active Wi-Fi / Ethernet IPv4 address (e.g. `192.168.0.101`).
2. **Generates Mobile Environment Configuration**: Writes `EXPO_PUBLIC_API_URL=http://<lan-ip>:3045` into `apps/mobile/.env.local`.
3. **Starts Next.js Test API Server**: Binds to `0.0.0.0:3045` so your phone can reach all `/api/v1/*` endpoints over LAN.
4. **Starts Expo Metro Bundler in LAN Mode**: Launches `npx expo start --lan`.
5. **Prints Interactive Terminal QR Code & Test Credentials**.

---

## 3. How to Connect on Your Phone

1. **Android**:
   - Open the **Expo Go** app on your phone.
   - Tap **"Scan QR code"** and point your camera at the QR code displayed in your terminal.
2. **iOS**:
   - Open the built-in iOS **Camera** app.
   - Point your camera at the terminal QR code.
   - Tap the **"Open in Expo Go"** banner that appears.

The JavaScript bundle will stream from your laptop to your phone in ~5-10 seconds.

---

## 4. Pre-Seeded Test Credentials

To populate your test database with all 3 test user roles, active subscriptions, and mock test attempts, run:

```bash
npm run seed:mobile-test
```

### Available Test Roles:

| Role | Email / Identifier | Password | Included State |
| :--- | :--- | :--- | :--- |
| **Guest** | *(No login required)* | *None* | Free catalogue browsing, 20% preview slicing on tutorials/books, Authwall prompts |
| **Student (Pro)** | `student.mobile@aspirantbook.com` | `Student123!` | Active PRO subscription, enrolled courses, 2 test attempts (1 in-progress, 1 submitted) |
| **Admin / Teacher** | `admin.mobile@aspirantbook.com` | `Admin123!` | Full administrative privileges, authoring, and test series inspection |

---

## 5. Canonical API URL Construction Standard

- **Environment Origin**: `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.local` is set to `http://<lan-ip>:3045` (or `http://10.0.2.2:3045` on Android emulator, `http://localhost:3045` on iOS simulator).
- **Endpoint Prefix**: All mobile API communication is strictly scoped under `/api/v1/*`.
- **Client Normalization**: `apps/mobile/src/lib/api.ts` automatically strips any accidental trailing slashes or duplicate `/api/v1` suffixes to prevent malformed URLs (`rawApiUrl.replace(/\/$/, "").replace(/\/api\/v1\/?$/, "")`).

---

## 6. Step-by-Step Test Series & Offline Resilience Flow

Follow these steps on your physical phone to verify real-time performance and offline resilience:

### A. Online Test Taking
1. Launch **AspirantBook** in Expo Go.
2. Sign in with `student.mobile@aspirantbook.com` / `Student123!`.
3. Tap **Practice** (or **Home** banner) -> Select an active Test Series -> Tap **Start Test**.
4. The CBT question runner loads instructions, questions, palette, and server-synchronized countdown timer.
5. Tap an answer option (e.g. Option B). Notice immediate state update in the question palette.

### B. Offline Resilience (Airplane Mode Test)
1. While answering question 3, swipe down the phone notification shade and enable **Airplane Mode** (Wi-Fi and mobile data OFF).
2. Answer the next 3 questions (questions 4, 5, 6) and mark question 5 for review.
3. Observe:
   - The countdown timer continues smoothly based on the authoritative server deadline.
   - All answers are safely buffered in local memory storage.
4. Disable **Airplane Mode** (reconnect Wi-Fi).
5. Within seconds, the offline answer queue flushes automatically in monotonic sequence order.
6. Tap **Submit Test**.
7. The authoritative server grades the attempt, calculates percentile and rank, and displays the comprehensive breakdown score card.

---

## 7. Switching to Dev Database (Supabase)

> [!CAUTION]
> **READ-ONLY MANDATE**: The Supabase development database is strictly read-only.
> Never run migrations, schema pushes, seed commands, or write queries against Dev Supabase.

By default, `npm run dev:lan` runs against the isolated local Docker test database (`127.0.0.1:54329`) to ensure zero-risk testing.

If you specifically need to view live development catalogue data from Supabase:
1. Set `APP_ENV=development` in your shell before starting the dev server:
   ```bash
   APP_ENV=development npm run dev:lan
   ```
2. **Strict Rule**: Perform **SELECT / Read-only browsing** only. Do not complete payments or invoke destructive admin mutations while connected to the dev database.

---

## 8. Troubleshooting

### Problem 1: "Network response timed out" or "Could not connect to server"
- **Cause**: Wi-Fi Client Isolation is enabled on your router (common on university, office, or public guest Wi-Fi networks).
- **Fix**:
  1. Connect your phone to your laptop's **Personal Hotspot** (or vice versa).
  2. Re-run `npm run dev:lan`. The script will detect your hotspot IP and update `apps/mobile/.env.local`.

### Problem 2: macOS Firewall Blocking Port 3045
- **Cause**: macOS Application Firewall is blocking incoming connections to the Node.js process.
- **Fix**:
  1. Open **System Settings -> Network -> Firewall**.
  2. Ensure Node / Next.js is allowed to accept incoming connections, or temporarily allow incoming connections for local development.

### Problem 3: IP Address Changed After Changing Locations
- If you disconnect from Wi-Fi or change networks, your LAN IP changes.
- Simply restart `npm run dev:lan`. The script re-scans network adapters, updates `.env.local`, and generates a fresh QR code immediately.
