const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Fetch all three products and their prices from Stripe in parallel
    const [
      healthAssistOnetime,
      healthAssistRecurring,
      anniePrice,
      affiliatedPrice,
    ] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_ONETIME_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_RECURRING_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_ANNIE_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_AFFILIATED_PRICE_ID),
    ]);

    res.status(200).json({
      products: [
        {
          id: 'healthassist',
          name: 'HealthAssist RPM',
          description: 'Remote patient monitoring hardware, kit & ongoing support',
          onetimePrice: healthAssistOnetime.unit_amount / 100,
          onetimePriceId: healthAssistOnetime.id,
          recurringPrice: healthAssistRecurring.unit_amount / 100,
          recurringPriceId: healthAssistRecurring.id,
          type: 'bundle', // one-time + recurring
        },
        {
          id: 'annie',
          name: 'Annie: AI Nurse',
          description: 'AI Powered Nurse Assistant — always on, always caring',
          recurringPrice: anniePrice.unit_amount / 100,
          recurringPriceId: anniePrice.id,
          type: 'recurring',
        },
        {
          id: 'affiliated',
          name: 'Affiliated Monitoring',
          description: 'Live agents monitoring the people that matter most',
          recurringPrice: affiliatedPrice.unit_amount / 100,
          recurringPriceId: affiliatedPrice.id,
          type: 'recurring',
        },
      ],
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
