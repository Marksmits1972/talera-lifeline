// Apply ONLY to an independently verified, current Clean Core source snapshot.
// Does not deploy and refuses unexpected layouts.
export function patchSyntheticPilotBucket(source) {
  const marker = 'async function premiumCloudPilotRoutes(';
  const start = source.indexOf(marker);
  if (start < 0) throw Error('pilot function missing');
  const end = source.indexOf('async function ', start + marker.length);
  if (end < 0) throw Error('pilot function boundary missing');
  const section = source.slice(start, end);
  const count = section.split('env.PREMIUM_MEDIA').length - 1;
  if (count !== 8) throw Error('unexpected number of R2 references: ' + count);
  const changed = section.replaceAll('env.PREMIUM_MEDIA', 'env.PREMIUM_PRIVATE');
  return source.slice(0, start) + changed + source.slice(end);
}
