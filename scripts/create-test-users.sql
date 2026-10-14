-- Canonical seed runner: npx tsx scripts/seed-rbac-users.ts
-- Reads password from DEFAULT_TEST_PASSWORD in tests/support/test-credentials.ts
-- (Default: Test@123 or process.env.TEST_USER_PASSWORD)

-- 1. Free User 1
INSERT INTO "User" (id, name, email, password, image, role, xp, level, streak, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Free User One',
    'freeuser1@example.com',
    '$2a$10$lpyNFDyHyavcyWL//Qa.QuSOH.RnwEMkc8Qnp2edm6Wl9xKqBiP3C',
    NULL,
    'FREE',
    0,
    1,
    0,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password = EXCLUDED.password;

-- 2. Free User 2
INSERT INTO "User" (id, name, email, password, image, role, xp, level, streak, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Free User Two',
    'freeuser2@example.com',
    '$2a$10$nImDs8lMk.UXQP/Pyom5reUYSqD75FAyZZBnhPjJaHh4Rf0LUDSce',
    NULL,
    'FREE',
    0,
    1,
    0,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password = EXCLUDED.password;

-- 3. Premium User
INSERT INTO "User" (id, name, email, password, image, role, xp, level, streak, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Premium User',
    'premiumuser@example.com',
    '$2a$10$XZ52NkqVPJw1jvTSj4D2R.RQFYzNfQVJnnAJcOVrSqJ6ZZE6LwC5i',
    NULL,
    'PREMIUM',
    0,
    1,
    0,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password = EXCLUDED.password;

-- 4. Admin User
INSERT INTO "User" (id, name, email, password, image, role, xp, level, streak, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Admin User',
    'adminuser@example.com',
    '$2a$10$CUyByaX6TscDNxz0EViRpeyzHGnWkDZMw1vfSSYcz5FQXbuHjvxXq',
    NULL,
     'ADMIN',
    0,
    1,
    0,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password = EXCLUDED.password;

-- Verify the users were created
SELECT id, name, email, role, xp, level, "createdAt"
FROM "User"
WHERE email IN ('freeuser1@example.com', 'freeuser2@example.com', 'premiumuser@example.com', 'adminuser@example.com')
ORDER BY role, email;

-- Optional: Update your existing user to ADMIN role
-- Replace 'your-email@example.com' with your actual email
-- UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';

