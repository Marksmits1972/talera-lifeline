export async function handleWorkbladDatePolicy(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/v9/memory' || request.method !== 'POST') return null;
  let payload = null;
  try { payload = await request.clone().json(); } catch { return null; }
  if (isFutureExactDate(payload?.eventTime)) {
    return json({ error:'Een herinnering kan niet op een datum in de toekomst worden geplaatst.' }, 422);
  }
  return null;
}

export function isFutureExactDate(value) {
  const raw = String(value || '').trim().toLocaleLowerCase('nl-NL');
  if (!raw) return false;
  const months = {januari:1,februari:2,maart:3,april:4,mei:5,juni:6,juli:7,augustus:8,september:9,oktober:10,november:11,december:12};
  let year = 0, month = 0, day = 0;
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  } else {
    match = raw.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    if (!match || !months[match[2]]) return false;
    day = Number(match[1]); month = months[match[2]]; year = Number(match[3]);
  }
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const candidate = Date.UTC(year, month - 1, day);
  return Number.isFinite(candidate) && candidate > today;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store, max-age=0'}
  });
}
