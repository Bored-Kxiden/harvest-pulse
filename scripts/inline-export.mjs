/** Fold a Next static export into one file that runs from a phone's Downloads folder.
 *
 *  The standalone used to be a hand-written vanilla-JS copy of the app kept in step by
 *  hand. Every round it drifted further, and this round added parent mode, a recorder,
 *  three puzzles and a rewards loop, which is more than a mirror can carry. This builds
 *  the real app instead: same React, same CSS, same code paths, just flattened into a
 *  single file with the fonts baked in so nothing is fetched at open time. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const root = process.argv[2] ?? '.next-export'
const target = process.argv[3] ?? 'public/harbor-v2.html'
/* Hrefs arrive as https://harbor.invalid/_next/... (see assetPrefix), or as plain
   paths. Either way the file lives under the export root at whatever follows. */
const asset = href => join(root, href.split('?')[0].replace(/^https?:\/\/[^/]+/, '').replace(/^\.?\//, ''))

let html = readFileSync(join(root, 'index.html'), 'utf8')
const missing = []

/* ---- fonts: next/font self-hosts woff2 next to the CSS, so bake them in ---- */
const inlineFonts = (css, from) => css.replace(/url\(([^)]+\.woff2?)\)/g, (whole, raw) => {
  const clean = raw.replace(/['"]/g, '')
  const path = /^(https?:)?\/\//.test(clean) || clean.startsWith('/') || clean.startsWith('./')
    ? asset(clean)
    : join(dirname(from), clean)
  if (!existsSync(path)) { missing.push(clean); return whole }
  const kind = path.endsWith('.woff2') ? 'font/woff2' : 'font/woff'
  return `url(data:${kind};base64,${readFileSync(path).toString('base64')})`
})

/* ---- stylesheets ---- */
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, tag => {
  const href = tag.match(/href="([^"]+)"/)?.[1]
  if (!href) return tag
  const path = asset(href)
  if (!existsSync(path)) { missing.push(href); return '' }
  return `<style>${inlineFonts(readFileSync(path, 'utf8'), path)}</style>`
})

/* ---- currentScript shim ----
   Next's runtime reads document.currentScript.src to work out where its chunks live,
   and insists the value contains "/_next/". An inlined script has an empty src, so it
   throws before the app ever mounts. It is handed a real, detached <script> element
   carrying the prefix instead: nothing is fetched from it, and the runtime is
   satisfied. Everything it would have loaded is already in this file. */
const shim = `<script>(function(){var f=document.createElement('script');`
  + `f.src='https://harbor-runtime.invalid/_next/static/chunks/inlined.js';`
  + `try{Object.defineProperty(document,'currentScript',{configurable:true,get:function(){return f}})}catch(e){}})()</` + `script>`
let shimmed = false

/* ---- scripts ---- */
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
  const path = asset(src)
  if (!existsSync(path)) { missing.push(src); return '' }
  /* `</script>` inside a string literal would close this tag early. */
  const code = readFileSync(path, 'utf8').replace(/<\/script/gi, '<\\/script')
  const before = shimmed ? '' : shim
  shimmed = true
  return `${before}<script defer>${code}</script>`
})

/* ---- links to files that will not exist beside a downloaded page ---- */
html = html.replace(/<link[^>]*rel="(manifest|preload|prefetch|icon|apple-touch-icon)"[^>]*>/g, '')

/* ---- the icon, small enough to carry inline ---- */
const icon = join(root, 'icon.svg')
if (existsSync(icon)) {
  const data = `data:image/svg+xml;base64,${readFileSync(icon).toString('base64')}`
  html = html.replace('</head>', `<link rel="icon" href="${data}"/></head>`)
}

/* ---- asset URLs left inside React's own payload ----
   The streamed payload names the stylesheets and fonts so React can re-insert them
   during hydration. Both are already inlined above, so the copies are pure network
   noise, and on a phone with no signal they are four failed requests on open. Each
   one is pointed at an inert data: URL: React still inserts its link, the link
   resolves to nothing, and the page never reaches for the network. The shim above
   deliberately uses a different host so this pass leaves its marker alone. */
html = html.replace(/https:\/\/harbor\.invalid\/_next\/[^"'\\\s)]+/g,
  url => url.endsWith('.css') ? 'data:text/css,' : 'data:,')

/* A downloaded file has no server to set the charset, and the meadow's labels and
   the copy are full of characters that break without it. */
if (!/charset/i.test(html)) html = html.replace(/<head>/i, '<head><meta charset="utf-8"/>')

writeFileSync(target, html)
const kb = (html.length / 1024).toFixed(0)
console.log(`${target}: ${kb} KB, ${html.match(/<script/g)?.length ?? 0} scripts, ${html.match(/<style/g)?.length ?? 0} styles`)
if (missing.length) console.log('MISSING:', [...new Set(missing)].join(', '))
if (/(src|href)="[^"]*_next/.test(html)) console.log('WARNING: unresolved _next reference left in the page')
/* One reference survives on purpose: webpack's public-path constant, which nothing
   ever reads because every chunk is already in the file. Anything in an href or src
   would be a real request and is worth shouting about. */
if (/(?:href|src)="https:\/\/harbor\.invalid/.test(html)) console.log('WARNING: an asset URL still points at the network')
