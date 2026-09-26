// What the launcher does with whatever answers on the collector port. Pure, so it is tested (`version.test.mjs`).

/** `1.2.10` vs `1.2.9` → positive. Non-numeric parts count as 0. */
export function compareVersions(a, b) {
  const parts = version =>
    String(version)
      .split('.')
      .map(part => Number.parseInt(part, 10) || 0);
  const [left, right] = [parts(a), parts(b)];
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return 0;
}

/**
 * @param {{ state: 'down' } | { state: 'foreign' } | { state: 'den', version: string }} current what answers on the port
 * @param {string} ours the version of the plugin running this launcher
 * @returns {'start' | 'running' | 'replace' | 'keep-newer' | 'dev' | 'foreign'}
 */
export function decide(current, ours) {
  if (current.state === 'down') {
    return 'start';
  }
  if (current.state === 'foreign') {
    // Something else owns the port: don't fight it, and don't make every session wait for a start that can't work.
    return 'foreign';
  }
  if (current.version === 'dev') {
    return 'dev';
  }
  const order = compareVersions(ours, current.version);
  if (order === 0) {
    return 'running';
  }
  // An old session (still on the previous plugin version) fires SessionStart on /clear, /compact or resume:
  // it must not downgrade a collector started by a newer version.
  return order > 0 ? 'replace' : 'keep-newer';
}
