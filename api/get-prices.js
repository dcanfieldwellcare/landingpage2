const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const [onetime, recurring, addon1, addon2] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_ONETIME_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_RECURRING_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_AFFILIATED_PRICE_ID), // Affiliated Monitoring
      stripe.prices.retrieve(process.env.STRIPE_ANNIE_PRICE_ID), // Annie: AI Nurse
    ]);

    res.status(200).json({
      onetime:   onetime.unit_amount / 100,
      recurring: recurring.unit_amount / 100,
      addons: {
        addon1: addon1.unit_amount / 100,
        addon2: addon2.unit_amount / 100,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
