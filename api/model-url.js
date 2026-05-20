const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://plataformasapiens.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // verificar token do usuário
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autorizado' });

  try {
    // verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

    // verificar plano do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, active')
      .eq('id', user.id)
      .single();

    if (!profile?.active) return res.status(403).json({ error: 'Conta bloqueada' });

    const { file, module_plan } = req.query;
    if (!file) return res.status(400).json({ error: 'Arquivo não informado' });

    // verificar se o plano do usuário permite acesso
    const planHierarchy = { free: 0, mensal: 1, anual: 2, premium: 3 };
    const userLevel = planHierarchy[profile.plan] ?? 0;
    const requiredLevel = planHierarchy[module_plan] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'Plano insuficiente' });
    }

    // gerar URL temporária (expira em 1 hora)
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: file,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return res.status(200).json({ url });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
