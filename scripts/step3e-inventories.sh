#!/bin/bash
set -e

echo "=== 1. HANDLERS RETURNING LESSON DATA ==="
grep -rn "course-dto" app/api/ lib/ components/ || true

echo -e "\n=== 2. CODE PATHS CREATING/UPDATING PAYMENT OR ENROLLMENT ==="
grep -rn "prisma\.payment\.create\|prisma\.payment\.update\|prisma\.enrollment\.create\|prisma\.enrollment\.update" app/ lib/ || true

echo -e "\n=== 3. APP/CHECKOUT/PAGE.TSX PAYMENT INVOCATION ==="
grep -rn "createRazorpayOrder\|verifyRazorpayPayment" app/checkout/ || true

echo -e "\n=== 4. READERS OF COURSE AND STATUS FILTER ==="
grep -rn "isCourseVisibleToUser\|isPublished\|course\.find" lib/ courses/ app/ || true

echo -e "\n=== 5. DEMO30 GREP ==="
grep -rn "DEMO30" app/ lib/ components/ scripts/ prisma/ || true

echo -e "\n=== 6. COURSE PROMO BADGE GREP ==="
grep -rn "CoursePromoBadge\|badgeLabel\|showOnThumbnail" app/ components/ lib/ || true

echo -e "\n=== 7. PREVIEW ENDPOINT RATE LIMITER ==="
grep -rn "rateLimit" app/api/coupons/preview/ || true
