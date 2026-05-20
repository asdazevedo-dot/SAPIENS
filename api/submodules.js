const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { module_id } = req.query;
  if (!module_id) return res.status(400).json({ error: 'module_id obrigatório' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { realtime: { transport: ws } }
    );
    const { data, error } = await supabase
      .from('submodules')
      .select('*')
      .eq('module_id', module_id)
      .order('id');

    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
