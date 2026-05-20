const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: { transport: ws }
    });
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('id');

    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
