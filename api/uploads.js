const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png']);

function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  return json(res, 501, {
    error: 'Upload storage is not configured',
    message: 'Configure an object-storage provider before accepting CVs or certificates.'
  });
};

module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
module.exports.ALLOWED_MIME_TYPES = [...ALLOWED];
