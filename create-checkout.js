const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Could not parse request body' });
  }

  const { quantity = 1, code, watchName, addons = [] } = body;
  const qty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1));

  console.log('create-checkout called:', JSON.stringify({ qty, addons, watchName, code }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;

  const ADDON_PRICE_MAP = {
    addon1: process.env.STRIPE_AFFILIATED_PRICE_ID,
    addon2: process.env.STRIPE_ANNIE_PRICE_ID,
  };

  console.log('ADDON_PRICE_MAP:', JSON.stringify({
    addon1: ADDON_PRICE_MAP.addon1 ? 'SET' : 'MISSING',
    addon2: ADDON_PRICE_MAP.addon2 ? 'SET' : 'MISSING',
  }));

  const lineItems = [
    { price: process.env.STRIPE_ONETIME_PRICE_ID,   quantity: qty },
    { price: process.env.STRIPE_RECURRING_PRICE_ID, quantity: qty },
  ];

  for (const addon of addons) {
    const priceId = ADDON_PRICE_MAP[addon.id];
    console.log(`Addon: id=${addon.id}, resolved priceId=${priceId || 'NOT FOUND'}`);
    if (priceId) {
      lineItems.push({ price: priceId, quantity: qty });
    }
  }

  console.log('Final lineItems:', JSON.stringify(lineItems));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${baseUrl}/success.html`,
      cancel_url:  `${baseUrl}/`,
      metadata: {
        watchName: watchName || '',
        code:      code      || '',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
