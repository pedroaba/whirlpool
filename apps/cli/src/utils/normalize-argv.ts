/**
 * Maps PRD-style multi-token commands to the names expected by cac.
 * Trash and cache use real subcommands (`trash list`, `cache clean`); only
 * `orphans clean` stays kebab-case as a single token.
 */
export function normalizePrdSubcommands(argv: string[]): string[] {
  const a = [...argv]
  if (a[0] === 'orphans' && a[1] === 'clean') {
    a.splice(0, 2, 'orphans-clean')
  } else if (a[0] === 'trash' && a[1] === 'empty') {
    // Legacy alias: same as `trash clear`
    a[1] = 'clear'
  }
  return a
}
