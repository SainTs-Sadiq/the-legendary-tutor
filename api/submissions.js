const crypto = require('crypto');

const MAX_BODY = 64 * 1024;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;
const buckets = new Map();

function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return String(forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function allowedOrigin(req) {
  const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!configured.length) return true;
  const origin = req.headers.origin;
  return !origin || configured.includes(origin);
}

function rateLimited(ip) {
  const now = Date.now();
  const item = buckets.get(ip);
  if (!item || now - item.started > WINDOW_MS) {
    buckets.set(ip, { started: now, count: 1 });
    return false;
  }
  item.count += 1;
  return item.count > MAX_REQUESTS;
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

function clean(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validate(payload) {
  const type = clean(payload.type, 30);
  if (!['requestTutor', 'becomeTutor', 'contact'].includes(type)) return 'Invalid submission type';
  if (clean(payload.website)) return 'Spam detected';
  if (!clean(payload.email).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Valid email is required';
  if (!clean(payload.fullName, 150)) return 'Full name is required';
  if (type === 'contact' && !clean(payload.message, 10000)) return 'Message is required';
  if (type === 'requestTutor' && !clean(payload.learningGoals, 10000)) return 'Learning goals are required';
  return null;
}

async function sendEmail(payload) {
  const webhook = process.env.SUBMISSION_WEBHOOK_URL;
  if (!webhook) return false;
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'tutor_submission',
      id: payload.id,
      type: payload.type,
      createdAt: payload.createdAt,
      data: payload.data
    })
  });
  if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
  return true;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!allowedOrigin(req)) return json(res, 403, { error: 'Origin not allowed' });
  if (rateLimited(clientIp(req))) return json(res, 429, { error: 'Too many submissions. Please try again later.' });

  try {
    const body = await readBody(req);
    const error = validate(body);
    if (error) return json(res, 400, { error });

    const payload = {
      id: crypto.randomUUID(),
      type: clean(body.type, 30),
      createdAt: new Date().toISOString(),
      data: body.data && typeof body.data === 'object' ? body.data : body
    };
    delete payload.data.website;

    await sendEmail(payload);
    return json(res, 201, { ok: true, id: payload.id });
  } catch (error) {
    console.error(error);
    return json(res, error.status || 500, { error: 'Unable to process submission' });
  }
};
