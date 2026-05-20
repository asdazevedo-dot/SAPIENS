const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { priceId, userId, userEmail, plan } = req.body;
  if (!priceId || !userId) return res.status(400).json({ error: 'Dados incompletos' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      success_url: `${process.env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}&plan=${plan}`,
      cancel_url: `${process.env.SITE_URL}/cancel`,
      metadata: { userId, plan },
      locale: 'pt-BR',
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};