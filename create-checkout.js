const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const { quantity = 1, code, watchName, productId, addons = [] } = req.body;

  if (!productId) return res.status(400).json({ error: 'No product selected.' });

  try {
    const lineItems = [];

    if (productId === 'healthassist') {
      // Bundle: one-time + recurring
      lineItems.push({
        price: process.env.STRIPE_ONETIME_PRICE_ID,
        quantity,
      });
      lineItems.push({
        price: process.env.STRIPE_RECURRING_PRICE_ID,
        quantity,
      });
    } else if (productId === 'annie') {
      lineItems.push({
        price: process.env.STRIPE_ANNIE_PRICE_ID,
        quantity,
      });
    } else if (productId === 'affiliated') {
      lineItems.push({
        price: process.env.STRIPE_AFFILIATED_PRICE_ID,
        quantity,
      });
    } else {
      return res.status(400).json({ error: 'Unknown product.' });
    }

    // Add any extra add-ons (only relevant for healthassist bundle)
    for (const addon of addons) {
      if (addon.stripePrice) {
        lineItems.push({ price: addon.stripePrice, quantity });
      }
    }

    const metadata = {};
    if (watchName) metadata.watch_name = watchName;
    if (code) metadata.code = code;
    metadata.product_id = productId;

    const session = await stripe.checkout.sessions.create({
      mode: lineItems.some(li =>
        [process.env.STRIPE_RECURRING_PRICE_ID, process.env.STRIPE_ANNIE_PRICE_ID, process.env.STRIPE_AFFILIATED_PRICE_ID]
          .includes(li.price)
      ) ? 'subscription' : 'payment',
      line_items: lineItems,
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
