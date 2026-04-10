const ACCESS_COOKIE = 'langify-access-token';
const REFRESH_COOKIE = 'langify-refresh-token';

function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split('=');
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

function appendCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [cookie]);
    return;
  }

  const values = Array.isArray(existing) ? existing : [existing];
  values.push(cookie);
  res.setHeader('Set-Cookie', values);
}

function setSessionCookies(res, session) {
  const secure = process.env.NODE_ENV === 'production';
  const common = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;

  appendCookie(res, `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; Max-Age=${session.expires_in || 3600}; ${common}`);
  appendCookie(res, `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; Max-Age=${60 * 60 * 24 * 30}; ${common}`);
}

function clearSessionCookies(res) {
  const secure = process.env.NODE_ENV === 'production';
  const common = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;

  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; Max-Age=0; ${common}`,
    `${REFRESH_COOKIE}=; Max-Age=0; ${common}`
  ]);
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  parseCookies,
  setSessionCookies,
  clearSessionCookies
};
