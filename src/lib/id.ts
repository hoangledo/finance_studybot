/**
 * Short random id (8 hex chars). Uses `crypto.getRandomValues`, not `crypto.randomUUID`:
 * randomUUID only exists on secure pages (HTTPS/localhost), so it's missing when a phone
 * opens the dev server over plain http on the LAN.
 */
export function uid(prefix = '') {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}
