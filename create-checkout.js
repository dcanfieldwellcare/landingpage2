const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { quantity, code } = req.body;

  // Validate quantity
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Invalid quantity.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      metadata: {
        code: code || '',
      },
      subscription_data: {
        metadata: {
          code: code || '',
        },
      },
      mode: 'subscription',
      line_items: [
        { price: process.env.STRIPE_RECURRING_PRICE_ID, quantity: qty },
        { price: process.env.STRIPE_ONETIME_PRICE_ID,   quantity: qty },
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
