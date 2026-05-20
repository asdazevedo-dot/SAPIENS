const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { session_id, user_id, plan } = req.body;
  if (!session_id || !user_id) return res.status(400).json({ error: 'Dados incompletos' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { realtime: { transport: ws } }
      );
      await supabase.from('profiles').update({
        plan: plan || 'mensal',
        active: true,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription
      }).eq('id', user_id);
      return res.status(200).json({ ok: true, plan });
    }
    return res.status(400).json({ error: 'Pagamento não confirmado' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
