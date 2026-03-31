import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Resvg } from '@resvg/resvg-js'

const ROOT = new URL('..', import.meta.url).pathname
const ICON_SVG = join(ROOT, 'packaging/macos/icon.svg')
const OUT_DIR = join(ROOT, 'packaging/macos/icon-out')
const ICONSET_DIR = join(ROOT, 'packaging/macos/AppIcon.iconset')
const ICNS_OUT = join(ROOT, 'packaging/macos/AppIcon.icns')
const TMP_DIR = join(ROOT, '.tmp/icon-build')

function sh(cmd: string, args: string[]): void {
  mkdirSync(TMP_DIR, { recursive: true })
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Keep temp files inside the workspace (helps sandboxes/CI).
      TMPDIR: TMP_DIR,
    },
  })
  if (r.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`)
  }
}

function ensureMacOS(): void {
  if (process.platform !== 'darwin') {
    throw new Error('build-icons is macOS-only (requires sips and iconutil).')
  }
}

function cleanOutputs(): void {
  rmSync(OUT_DIR, { recursive: true, force: true })
  rmSync(ICONSET_DIR, { recursive: true, force: true })
  rmSync(ICNS_OUT, { force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(ICONSET_DIR, { recursive: true })
}

function renderBasePng1024(): string {
  const svg = readFileSync(ICON_SVG, 'utf8')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 },
  })
  const png = resvg.render().asPng()
  const out = join(OUT_DIR, 'icon_1024x1024.png')
  writeFileSync(out, png)
  return out
}

function buildPngSizesFromBase(base1024: string): void {
  const sizes = [16, 32, 64, 128, 256, 512, 1024]
  for (const s of sizes) {
    const out = join(OUT_DIR, `icon_${s}x${s}.png`)
    if (s === 1024) continue
    sh('/usr/bin/sips', ['-z', String(s), String(s), base1024, '--out', out])
  }
  // 1024x1024 is written by renderBasePng1024() already.
}

function writeIconsetFromPngs(): void {
  const map: Array<[string, string]> = [
    ['icon_16x16.png', 'icon_16x16.png'],
    ['icon_16x16@2x.png', 'icon_32x32.png'],
    ['icon_32x32.png', 'icon_32x32.png'],
    ['icon_32x32@2x.png', 'icon_64x64.png'],
    ['icon_128x128.png', 'icon_128x128.png'],
    ['icon_128x128@2x.png', 'icon_256x256.png'],
    ['icon_256x256.png', 'icon_256x256.png'],
    ['icon_256x256@2x.png', 'icon_512x512.png'],
    ['icon_512x512.png', 'icon_512x512.png'],
    ['icon_512x512@2x.png', 'icon_1024x1024.png'],
  ]

  for (const [dst, src] of map) {
    const from = join(OUT_DIR, src)
    const to = join(ICONSET_DIR, dst)
    sh('/bin/cp', ['-f', from, to])
  }
}

function buildIcns(): void {
  sh('/usr/bin/iconutil', ['-c', 'icns', ICONSET_DIR, '-o', ICNS_OUT])
}

function main(): void {
  ensureMacOS()
  cleanOutputs()
  const base = renderBasePng1024()
  buildPngSizesFromBase(base)
  writeIconsetFromPngs()
  buildIcns()

  const marker = join(OUT_DIR, 'README.txt')
  writeFileSync(
    marker,
    [
      'Generated files:',
      '- AppIcon.icns: packaging/macos/AppIcon.icns',
      '- PNGs: packaging/macos/icon-out/icon_*x*.png',
      '- Iconset: packaging/macos/AppIcon.iconset/',
      '',
    ].join('\n'),
  )
}

main()
