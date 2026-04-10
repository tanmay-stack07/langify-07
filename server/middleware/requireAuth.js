const { authSupabase } = require('../supabaseClients');
const { ACCESS_COOKIE, parseCookies } = require('../utils/authCookies');

async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const accessToken = cookies[ACCESS_COOKIE];

    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { data, error } = await authSupabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.user = data.user;
    req.accessToken = accessToken;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth
};
