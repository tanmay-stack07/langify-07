const { authSupabase } = require('../supabaseClients');
const { ACCESS_COOKIE, parseCookies } = require('../utils/authCookies');

async function attachUserIfPresent(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const accessToken = cookies[ACCESS_COOKIE];

    if (!accessToken) {
      req.user = null;
      req.accessToken = null;
      return next();
    }

    const { data, error } = await authSupabase.auth.getUser(accessToken);

    if (error || !data.user) {
      req.user = null;
      req.accessToken = null;
      return next();
    }

    req.user = data.user;
    req.accessToken = accessToken;
    next();
  } catch (error) {
    const networkCode = error?.cause?.code || error?.code;
    if (networkCode === 'ENOTFOUND' || networkCode === 'ECONNRESET' || networkCode === 'ETIMEDOUT') {
      req.user = null;
      req.accessToken = null;
      console.warn('attachUserIfPresent: Supabase unavailable, continuing as signed-out user.');
      return next();
    }
    next(error);
  }
}

module.exports = {
  attachUserIfPresent
};
