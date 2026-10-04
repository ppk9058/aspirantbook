# Payment Integration - Quick Start Guide

## Current Status
✅ Stripe Integration - Complete
✅ Razorpay Integration - Complete
⏳ Testing Required

## Option 1: Test Stripe (Recommended First)

### Step 1: Verify Stripe Keys in .env.local
```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51SXqerDjzHZan5s4aSqlqJbiWwWcsX84Le9edbTx5w1EH1MGvERL2UcSFFrwGZyH1K7mbnCXHmczLsFABZS7j9L300EvNjqCOz"
```

### Step 2: Set Up Stripe Webhook (Local Testing)
Open a NEW terminal and run:
```bash
cd /Users/praveenkumar/aspirantbook
./scripts/setup-stripe-webhook.sh
```

This will:
1. Login to Stripe CLI
2. Forward webhooks to localhost:3000
3. Give you a webhook secret (whsec_...)

Add the webhook secret to .env.local:
```bash
STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"
```

### Step 3: Test Payment Flow
1. Go to http://localhost:3000/pricing
2. Click "Upgrade Now" on Monthly plan
3. Use test card: 4242 4242 4242 4242
4. Complete checkout
5. Verify subscription created

---

## Option 2: Add Razorpay

### Step 1: Get Razorpay Credentials
1. Visit: https://dashboard.razorpay.com/app/keys
2. Switch to Test Mode
3. Copy Key ID (rzp_test_...)
4. Generate and copy Key Secret

### Step 2: Add to .env.local
```bash
RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID"
RAZORPAY_KEY_SECRET="YOUR_SECRET"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID"
```

### Step 3: Test Razorpay
1. Go to http://localhost:3000/pricing
2. Toggle to "India (INR)"
3. Click "Upgrade Now"
4. Use test card: 4111 1111 1111 1111
5. Complete payment

---

## What to Do Next?

Choose one:
1. **Test Stripe** - Follow Option 1 above
2. **Add Razorpay** - Follow Option 2 above
3. **Skip Testing** - Move to Phase 9: Code Execution Engine

Let me know which you'd like to do!
