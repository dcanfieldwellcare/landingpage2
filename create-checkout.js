const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const { quantity, addons = [], code, watchName } = body;

  console.log('Received body:', JSON.stringify({ quantity, addons, code, watchName }));

  // Validate quantity
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Invalid quantity.' });
  }

  // Validate addon stripe price IDs (whitelist)
  const VALID_ADDON_PRICES = new Set([
    'price_1TJzVmIjMp6EX81N53iwtRJj', // Affiliated Monitoring
    'price_1TJzY1IjMp6EX81NDAxtaUNr', // Annie: AI Nurse
  ]);

  const addonLineItems = [];
  for (const addon of addons) {
    if (!VALID_ADDON_PRICES.has(addon.stripePrice)) {
      return res.status(400).json({ error: `Invalid addon price ID: ${addon.stripePrice}` });
    }
    addonLineItems.push({ price: addon.stripePrice, quantity: qty });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          // Recurring subscription
          price:    process.env.STRIPE_RECURRING_PRICE_ID,
          quantity: qty,
        },
        ...addonLineItems,
      ],
      subscription_data: {
        add_invoice_items: [
          {
            // One-time fee billed on the first invoice
            price:    process.env.STRIPE_ONETIME_PRICE_ID,
            quantity: qty,
          },
        ],
        metadata: {
          watchName: watchName || '',
          code:      code || '',
        },
      },
      metadata: {
        watchName: watchName || '',
        code:      code || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success.html`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
