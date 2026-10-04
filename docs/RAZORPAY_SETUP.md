# Razorpay Integration Setup Guide

## Prerequisites
- Razorpay account (create at https://razorpay.com)
- Test mode enabled (for development)

## Step 1: Get Razorpay API Keys

1. Go to https://dashboard.razorpay.com/app/keys
2. Switch to **Test Mode** (toggle in top-right)
3. Copy your **Key ID** (starts with `rzp_test_`)
4. Click "Generate Secret" and copy the **Key Secret**
5. Add them to `.env.local`:

```env
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
```

## Step 2: Pricing Configuration

The pricing is already configured in the code:
- **Monthly**: ₹1,499/month (~$19)
- **Yearly**: ₹14,999/year (~$190, 17% discount)

No need to create products in Razorpay Dashboard for basic integration.

## Step 3: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to http://localhost:3000/pricing
3. Toggle to "India (INR)" payment method
4. Click "Upgrade Now" on a plan
5. Use test card details:
   - Card Number: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: Any 3 digits
   - Name: Any name

## Step 4: Set Up Webhooks (Optional)

For production, you'll need to set up webhooks:

1. Go to https://dashboard.razorpay.com/app/webhooks
2. Click "Add New Webhook"
3. URL: `https://yourdomain.com/api/webhooks/razorpay`
4. Events to subscribe:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
5. Copy the webhook secret
6. Add to `.env.local`:
   ```env
   RAZORPAY_WEBHOOK_SECRET="..."
   ```

## Payment Flow

### How It Works:
1. User clicks "Upgrade Now" (Razorpay mode)
2. Frontend calls `/api/checkout/razorpay` to create order
3. Razorpay checkout modal opens
4. User completes payment
5. Razorpay calls success handler
6. Frontend calls `/api/verify-payment/razorpay` to verify signature
7. Backend creates subscription and payment records
8. User is upgraded to PREMIUM

### Security:
- Payment signature verification using HMAC SHA256
- Server-side validation of all payments
- No sensitive data stored in frontend

## Test Cards

### Success
```
Card: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
```

### Failure
```
Card: 4000 0000 0000 0002
```

### 3D Secure
```
Card: 4000 0025 0000 3155
OTP: 1234
```

## Production Setup

### Before Going Live:
1. Switch to live mode in Razorpay Dashboard
2. Get live API keys (start with `rzp_live_`)
3. Update environment variables with live keys
4. Set up production webhook endpoint
5. Test with small amounts first

### Security Checklist:
- ✅ Never commit `.env.local` to git
- ✅ Use environment variables in production
- ✅ Verify payment signatures
- ✅ Enable HTTPS in production
- ✅ Set up proper error logging
- ✅ Monitor failed payments

## Comparison: Stripe vs Razorpay

| Feature | Stripe | Razorpay |
|---------|--------|----------|
| **Best For** | International | India |
| **Payment Methods** | Cards, Wallets | Cards, UPI, Netbanking, Wallets |
| **Currency** | USD, EUR, etc. | INR |
| **Fees** | 2.9% + $0.30 | 2% (no fixed fee) |
| **Setup** | More complex | Simpler for India |
| **Documentation** | Excellent | Good |

## Troubleshooting

### Payment Not Processing
- Check if Razorpay keys are correct
- Verify test mode is enabled
- Check browser console for errors

### Signature Verification Failed
- Ensure `RAZORPAY_KEY_SECRET` is correct
- Check if order ID and payment ID match
- Verify signature calculation

### Checkout Not Opening
- Ensure Razorpay script is loaded
- Check if `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set
- Verify order creation succeeded

## Testing Scenarios

### Test Flows
1. ✅ Free → Monthly upgrade (Razorpay)
2. ✅ Monthly → Yearly upgrade
3. ✅ Payment failure handling
4. ✅ Signature verification
5. ✅ Subscription creation

### Test Different Payment Methods
- Credit/Debit Cards
- UPI (in production)
- Netbanking (in production)
- Wallets (in production)
