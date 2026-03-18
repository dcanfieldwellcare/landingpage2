# Stripe Bundle Checkout

A single-page checkout that lets customers pick a quantity — which simultaneously sets both a one-time item and a monthly subscription at that quantity.

## Project Structure

```
/
├── index.html               ← Checkout page
├── success.html             ← Post-payment confirmation page
├── api/
│   └── create-checkout.js  ← Vercel serverless function
├── package.json
├── .env.example             ← Copy this to .env.local for local dev
└── README.md
```

## Setup

### 1. Configure your products in Stripe

1. Go to **Stripe Dashboard → Products**
2. Create your **one-time product** with a one-time price — copy the Price ID (starts with `price_`)
3. Create your **subscription product** with a recurring monthly price — copy the Price ID
4. Note both Price IDs for step 3

### 2. Update `index.html`

Open `index.html` and update these values near the top of the `<script>` tag:

```js
const ONETIME_UNIT   = 49.00;  // your one-time price per unit
const RECURRING_UNIT = 19.00;  // your monthly price per unit
```

Also update the product name, description, and bullet points in the HTML to match your product.

### 3. Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in [vercel.com](https://vercel.com)
3. In Vercel → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (from Stripe → Developers → API Keys) |
| `STRIPE_RECURRING_PRICE_ID` | `price_...` (your recurring price) |
| `STRIPE_ONETIME_PRICE_ID` | `price_...` (your one-time price) |
| `NEXT_PUBLIC_BASE_URL` | `https://your-project.vercel.app` |

4. Deploy — Vercel auto-detects the `api/` folder and deploys it as serverless functions.

### Local development

```bash
npm install -g vercel
cp .env.example .env.local
# fill in your values in .env.local
vercel dev
```

## How it works

1. Customer selects a quantity on the page
2. Prices update in real time to reflect the quantity
3. On submit, the page calls `POST /api/create-checkout` with the quantity
4. The serverless function creates a Stripe Checkout Session with both prices at that quantity
5. Customer is redirected to Stripe's hosted checkout to pay
6. On success, Stripe redirects to `/success.html`
