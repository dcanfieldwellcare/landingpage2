const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { quantity, code, watchName, addons } = req.body;

  // Validate quantity
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Invalid quantity.' });
  }

  // Map addon IDs to their Stripe recurring Price IDs
  const ADDON_PRICE_IDS = {
    addon1: process.env.STRIPE_ADDON1_PRICE_ID,
    addon2: process.env.STRIPE_ADDON2_PRICE_ID,
  };

  const addonLineItems = (addons || [])
    .filter(a => ADDON_PRICE_IDS[a.id])
    .map(a => ({
      price: ADDON_PRICE_IDS[a.id],
      quantity: qty,
    }));

  try {
    const session = await stripe.checkout.sessions.create({
      metadata: {
        code:       code      || '',
        watch_name: watchName || '',
      },
      subscription_data: {
        metadata: {
          code:       code      || '',
          watch_name: watchName || '',
        },
      },
      mode: 'subscription',
      line_items: [
        { price: process.env.STRIPE_RECURRING_PRICE_ID, quantity: qty },
        { price: process.env.STRIPE_ONETIME_PRICE_ID,   quantity: qty },
        ...addonLineItems,
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success.html`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
