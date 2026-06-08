const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { session_id, user_id, plan } = req.body;
  console.log('verify-payment recebido:', { session_id: session_id?.slice(0,20), user_id, plan });
  
  if (!session_id || !user_id) return res.status(400).json({ error: 'Dados incompletos' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('session status:', session.status, 'payment_status:', session.payment_status);
    
    const isComplete = session.status === 'complete' ||
                       session.payment_status === 'paid' ||
                       session.subscription != null;

    if (isComplete) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { realtime: { transport: ws } }
      );

      // verificar se o perfil existe
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, plan')
        .eq('id', user_id);
      
      console.log('perfil encontrado:', existing);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan: plan || 'mensal',
          active: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq('id', user_id)
        .select();

      console.log('update resultado:', { data, error });

      if (error) throw error;
      return res.status(200).json({ ok: true, plan, updated: data });
    }

    return res.status(400).json({
      error: 'Pagamento não confirmado',
      status: session.status,
      payment_status: session.payment_status
    });
  } catch (err) {
    console.error('verify-payment erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
