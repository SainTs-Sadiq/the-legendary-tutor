const crypto = require('crypto');

const COOKIE = 'tlt_admin_session';
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

const clean = (v, n = 500) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const json = (res, status, data) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};
const clientIp = req => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
const limited = key => {
  const now = Date.now();
  const item = attempts.get(key);
  if (!item || now - item.started > WINDOW_MS) {
    attempts.set(key, { started: now, count: 1 });
    return false;
  }
  item.count += 1;
  return item.count > MAX_ATTEMPTS;
};
const secret = () => process.env.ADMIN_SESSION_SECRET || `${process.env.ADMIN_USERNAME || ''}:${process.env.ADMIN_PASSWORD || ''}`;
const sign = value => crypto.createHmac('sha256', secret()).update(value).digest('base64url');
const token = () => {
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

module.exports = async function(req, res) {
  if (req.method === 'GET') return json(res, 200, { authenticated: false });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (limited(clientIp(req))) return json(res, 429, { error: 'Too many login attempts. Please try again later.' });

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 8192) return json(res, 413, { error: 'Request too large' });
    }
    const data = JSON.parse(body || '{}');
    const username = clean(data.username, 150);
    const password = typeof data.password === 'string' ? data.password : '';
    const expectedUser = clean(process.env.ADMIN_USERNAME, 150);
    const expectedPassword = typeof process.env.ADMIN_PASSWORD === 'string' ? process.env.ADMIN_PASSWORD : '';
    if (!expectedUser || !expectedPassword) return json(res, 503, { error: 'Admin authentication is not configured.' });

    const userOk = username.length === expectedUser.length && crypto.timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser));
    const passwordOk = password.length === expectedPassword.length && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword));
    if (!userOk || !passwordOk) return json(res, 401, { error: 'Invalid username or password.' });

    res.setHeader('Set-Cookie', `${COOKIE}=${token()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    return json(res, 200, { ok: true, message: 'Login successful.' });
  } catch {
    return json(res, 400, { error: 'Invalid request.' });
  }
};

module.exports.COOKIE = COOKIE;
module.exports.verify = function(req) {
  const header = String(req.headers.cookie || '');
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return false;
  const [payload, signature] = match[1].split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.sub === 'admin' && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
};
