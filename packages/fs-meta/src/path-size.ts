import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export function getPathByteSize(
  rootPath: string,
  opts: { maxDepth: number },
): number {
  if (!existsSync(rootPath)) return 0
  let total = 0
  const walk = (p: string, depth: number): void => {
    let st
    try {
      st = lstatSync(p)
    } catch {
      return
    }
    if (st.isSymbolicLink()) return
    if (st.isFile()) {
      total += st.size
      return
    }
    if (!st.isDirectory()) return
    if (depth >= opts.maxDepth) return
    let names: string[] = []
    try {
      names = readdirSync(p)
    } catch {
      return
    }
    for (const n of names) {
      walk(join(p, n), depth + 1)
    }
  }
  walk(rootPath, 0)
  return total
}
