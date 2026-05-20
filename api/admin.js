const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // chave de serviço com acesso total
);

function checkAdmin(req) {
  const secret = req.headers['x-admin-secret'];
  return secret === process.env.ADMIN_SECRET;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://plataformasapiens.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // verificar segredo do admin
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { action } = req.query;

  try {
    // listar usuários
    if (action === 'users' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    // atualizar usuário
    if (action === 'update-user' && req.method === 'PATCH') {
      const { id, plan, active } = req.body;
      const { error } = await supabase
        .from('profiles')
        .update({ plan, active })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // salvar módulo
    if (action === 'save-module' && req.method === 'POST') {
      const { id, ...data } = req.body;
      if (id) {
        const { error } = await supabase.from('modules').update(data).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('modules').insert(data);
        if (error) throw error;
      }
      return res.status(200).json({ ok: true });
    }

    // deletar módulo
    if (action === 'delete-module' && req.method === 'DELETE') {
      const { id } = req.query;
      await supabase.from('submodules').delete().eq('module_id', id);
      await supabase.from('modules').delete().eq('id', id);
      return res.status(200).json({ ok: true });
    }

    // salvar subtema
    if (action === 'save-submodule' && req.method === 'POST') {
      const { id, ...data } = req.body;
      if (id) {
        const { error } = await supabase.from('submodules').update(data).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('submodules').insert(data);
        if (error) throw error;
      }
      return res.status(200).json({ ok: true });
    }

    // deletar subtema
    if (action === 'delete-submodule' && req.method === 'DELETE') {
      const { id } = req.query;
      await supabase.from('submodules').delete().eq('id', id);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Ação inválida' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
