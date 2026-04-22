const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { quantity = 1, code, watchName, addons = [] } = req.body;
  const qty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;

  // Map addon IDs to server-side price IDs from Vercel env vars
  const ADDON_PRICE_MAP = {
    addon1: process.env.STRIPE_AFFILIATED_PRICE_ID,
    addon2: process.env.STRIPE_ANNIE_PRICE_ID,
  };

  // Core line items
  const lineItems = [
    {
      price: process.env.STRIPE_ONETIME_PRICE_ID,
      quantity: qty,
    },
    {
      price: process.env.STRIPE_RECURRING_PRICE_ID,
      quantity: qty,
    },
  ];

  // Add selected addon subscriptions at the same quantity as the core products
  for (const addon of addons) {
    const priceId = ADDON_PRICE_MAP[addon.id];
    if (priceId) {
      lineItems.push({
        price: priceId,
        quantity: qty,
      });
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        watchName: watchName || '',
        code: code || '',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
