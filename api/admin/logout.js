const COOKIE = 'tlt_admin_session';
module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify({ ok: true }));
};
