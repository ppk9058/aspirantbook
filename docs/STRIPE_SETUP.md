# Stripe Integration Setup Guide

## Prerequisites
- Stripe account (create at https://stripe.com)
- Test mode enabled (for development)

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Add them to `.env.local`:

```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

## Step 2: Create Products and Prices

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"

### Monthly Plan
- Name: "aspirantbook Monthly"
- Description: "Full access with monthly billing"
- Pricing: $19/month (recurring)
- Copy the **Price ID** (starts with `price_`)

### Yearly Plan
- Name: "aspirantbook Yearly"
- Description: "Full access with yearly billing - Save 17%"
- Pricing: $190/year (recurring)
- Copy the **Price ID**

3. Add price IDs to `.env.local`:

```env
STRIPE_MONTHLY_PRICE_ID="price_..."
STRIPE_YEARLY_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID="price_..."
```

## Step 3: Set Up Webhooks

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

### Events to Listen For
The webhook handler processes these events:
- `checkout.session.completed` - New subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. In another terminal, run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Navigate to http://localhost:3000/pricing
4. Click "Upgrade Now" on a plan
5. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

## Production Setup

### Before Going Live:
1. Switch to live mode in Stripe Dashboard
2. Get live API keys (start with `pk_live_` and `sk_live_`)
3. Create live products and prices
4. Set up production webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: Same as above
5. Update environment variables with live keys

### Security Checklist:
- ✅ Never commit `.env.local` to git
- ✅ Use environment variables in production
- ✅ Verify webhook signatures
- ✅ Enable HTTPS in production
- ✅ Set up proper error logging
- ✅ Monitor failed payments

## Troubleshooting

### Webhook Not Receiving Events
- Check if Stripe CLI is running
- Verify webhook secret is correct
- Check server logs for errors

### Checkout Redirect Not Working
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check if price IDs are valid
- Ensure user is authenticated

### Payment Not Updating Database
- Check webhook handler logs
- Verify database connection
- Check Prisma schema is up to date

## Testing Scenarios

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Test Flows
1. ✅ Free → Monthly upgrade
2. ✅ Monthly → Yearly upgrade
3. ✅ Cancel subscription
4. ✅ Payment failure handling
5. ✅ Webhook event processing
