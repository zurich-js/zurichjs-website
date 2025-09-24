export function makeSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-')
}
