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
    const isComplete = session.status === 'complete' ||
                       session.payment_status === 'paid' ||
                       session.subscription != null;

    if (isComplete) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { realtime: { transport: ws } }
      );

      const cpf = session.metadata?.cpf || '';
      const name = session.metadata?.name || '';
      const phone = session.metadata?.phone || '';
      const planFinal = plan || session.metadata?.plan || 'mensal';

      // verificar CPF duplicado (outro usuário com mesmo CPF)
      if (cpf) {
        const { data: cpfCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('cpf', cpf)
          .neq('id', user_id);
        
        if (cpfCheck && cpfCheck.length > 0) {
          return res.status(400).json({ 
            error: 'CPF já cadastrado', 
            code: 'CPF_DUPLICATE'
          });
        }
      }

      // verificar se perfil existe
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user_id);

      if (!existing || existing.length === 0) {
        await supabase.from('profiles').insert({
          id: user_id,
          name,
          full_name: name,
          plan: planFinal,
          active: true,
          cpf,
          phone,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        });
      } else {
        await supabase.from('profiles').update({
          plan: planFinal,
          active: true,
          cpf: cpf || undefined,
          name: name || undefined,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        }).eq('id', user_id);
      }

      return res.status(200).json({ ok: true, plan: planFinal });
    }

    return res.status(400).json({
      error: 'Pagamento não confirmado',
      status: session.status,
      payment_status: session.payment_status
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
