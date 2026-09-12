/** Build public/harbor-v2.html: the whole app in one file you can put on a phone.
 *
 *  It is a static export of this same codebase with every script, stylesheet and font
 *  folded inline, so it runs from a Downloads folder with no server and no network.
 *  Previously this file was a hand-written vanilla-JS copy of the app, re-synced by
 *  hand after every change; it drifted, and each round cost more than the last.
 *
 *  Run with: pnpm standalone
 */
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const run = (cmd, args, env) =>
  execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })

rmSync('.next-export', { recursive: true, force: true })
/* Webpack rather than Turbopack: its chunk runtime can be pointed at a fixed public
   path, while Turbopack's insists on reading each chunk's script.src, which inlining
   necessarily empties. */
run('npx', ['next', 'build', '--webpack'], { HARBOR_STANDALONE: '1' })
run('node', ['scripts/inline-export.mjs', '.next-export', 'public/harbor-v2.html'])
rmSync('.next-export', { recursive: true, force: true })
