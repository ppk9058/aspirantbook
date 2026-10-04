#!/bin/bash

# Stripe Webhook Setup for Local Testing
# Run this script in a separate terminal window

echo "🔧 Setting up Stripe webhook for local testing..."
echo ""
echo "Step 1: Login to Stripe CLI"
stripe login

echo ""
echo "Step 2: Forward webhooks to local server"
echo "This will give you a webhook signing secret (whsec_...)"
echo "Copy it and add to your .env.local file"
echo ""

stripe listen --forward-to localhost:3000/api/webhooks/stripe

# The webhook secret will be displayed in the output
# Add it to .env.local as:
# STRIPE_WEBHOOK_SECRET="whsec_..."
