export function uid(prefix = '') {
  return prefix + crypto.randomUUID().slice(0, 8)
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}
