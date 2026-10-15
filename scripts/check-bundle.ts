// Initial JS budget (NFR3): sums every script loaded at startup — the entry module and all
// <link rel="modulepreload"> chunks listed in dist/index.html — gzipped. Lazy chunks are excluded.
//   node scripts/check-bundle.ts
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 200

const html = readFileSync('dist/index.html', 'utf8')
const files = [
  ...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
].map((match) => match[1]!)

if (files.length === 0)
  throw new Error('No startup scripts found in dist/index.html (run the build first).')

let total = 0
for (const file of files) {
  const bytes = gzipSync(readFileSync(`dist${file}`), { level: 9 }).length
  total += bytes
  console.log(`  ${(bytes / 1024).toFixed(1).padStart(7)} kB  ${file}`)
}

const totalKb = total / 1024
console.log(`  ${totalKb.toFixed(1).padStart(7)} kB  total gzip (budget ${BUDGET_KB} kB)`)
if (totalKb > BUDGET_KB) {
  console.error(`Initial bundle over budget by ${(totalKb - BUDGET_KB).toFixed(1)} kB`)
  process.exit(1)
}
