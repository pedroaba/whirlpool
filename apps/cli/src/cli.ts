import type { WhirlpoolLogger } from '@whirlpool/logging'
import cac from 'cac'

import {
  runCacheClean,
  runCacheSize,
  runDisk,
  runOrphansClean,
  runScan,
  runTrashEmpty,
  runTrashList,
} from './commands/index.ts'
import { CLI_NAME, CLI_VERSION } from './utils/constants.ts'
import { outErr } from './utils/out.ts'

const USAGE_LINE = `<command> [options]

  Quick map
  ---------
  disk            boot volume used / free (statfs on /)
  scan            read-only ~/Library remnant list for one installed app
  orphans-clean   multiselect paths, then move selection to Finder Trash
  cache size      measure bytes removable via config (with live progress)
  cache clean     delete those cache paths after confirmation (--dry-run ok)
  trash list      enumerate ~/.Trash + sizes (Full Disk Access if denied)
  trash clear     permanently empty Trash via Finder (--yes skips prompt)

  ${CLI_NAME} ties scans to an installed app (display name or bundle id), uses your
  cache clean config for user caches, and never deletes on scan. Destructive actions
  are orphans-clean, cache clean, and trash clear; each asks for confirmation unless
  you pass --yes where supported.

  For every command: ${CLI_NAME} <command> --help (synopsis, options, examples).

  Tips: NO_COLOR=1 disables ANSI. LOG_LEVEL sets Pino verbosity on stderr. If trash list/clear
  fails with a permission error, add Full Disk Access for Terminal (or Cursor, iTerm, etc.).`

function ex(cmd: string): string {
  return `$ ${CLI_NAME} ${cmd}`
}

export function createCli(log: WhirlpoolLogger): ReturnType<typeof cac> {
  const cli = cac(CLI_NAME)

  cli.usage(USAGE_LINE)

  cli.help((sections) => sections)

  cli
    .example(ex('disk'))
    .example(ex('scan "Visual Studio Code"'))
    .example(ex('orphans-clean Spotify --dry-run'))
    .example(ex('cache size'))
    .example(ex('cache clean --dry-run'))
    .example(ex('trash list'))

  cli
    .command(
      'scan <target>',
      'Read-only Library sweep for one app (display name or bundle id); lists paths and sizes.',
    )
    .usage(
      'scan <app-name|bundle-id> [--json] [--dry-run]\n\n' +
        '  Resolves <target> to an installed application, then searches typical\n' +
        '  ~/Library locations (Caches, Application Support, Preferences, LaunchAgents,\n' +
        '  etc.) for folders and files associated with that app’s bundle id.\n' +
        '  Nothing is deleted. Use this to preview what orphans-clean could move\n' +
        '  to Trash.',
    )
    .option(
      '--json',
      'Print a single JSON object: matched app, disk snapshot, candidates[], counts, bytes',
    )
    .option(
      '--dry-run',
      'No effect on scan (scan never writes); useful when scripting the same argv as destructive commands',
    )
    .example(ex('scan com.microsoft.VSCode'))
    .example(ex('scan Safari --json'))
    .action(
      async (target: string, options: { json?: boolean; dryRun?: boolean }) => {
        log.info({ command: 'scan', json: !!options.json }, 'command_begin')
        await runScan(!!options.json, !!options.dryRun, target)
      },
    )

  cli
    .command(
      'orphans-clean <target>',
      'Same discovery as scan; pick items in a TUI, confirm, then move to Finder Trash.',
    )
    .usage(
      'orphans-clean <app-name|bundle-id> [--dry-run]\n\n' +
        '  Runs the remnant scan for the resolved app, opens a multiselect of candidate\n' +
        '  paths (sorted by size), then asks for final confirmation. Moves use the\n' +
        '  same macOS mechanism as Finder (files stay recoverable from Trash until\n' +
        '  emptied). Use --dry-run to see totals without moving.',
    )
    .option(
      '--dry-run',
      'After selection, print how much would be moved and skip movePathsToTrashMacOS',
    )
    .example(ex('orphans-clean Spotify'))
    .example(ex('orphans-clean com.todesktop.230313mzl4w4u92 --dry-run'))
    .action(async (target: string, options: { dryRun?: boolean }) => {
      log.info({ command: 'orphans-clean' }, 'command_begin')
      await runOrphansClean({
        dryRun: !!options.dryRun,
        target,
      })
    })

  cli
    .command(
      'trash <subcommand>',
      'list: items in ~/.Trash + metadata; clear: Finder “empty trash” API (irreversible).',
    )
    .usage(
      'trash list\n' +
        'trash clear [--yes]\n\n' +
        '  list — Reads your user Trash folder, prints name, size, path, inferred app,\n' +
        '         and file metadata. If macOS denies access (TCC), the CLI explains\n' +
        '         how to grant Full Disk Access to the host app (Terminal, Cursor, …).\n\n' +
        '  clear — Computes current Trash size, optionally prompts, then asks Finder to\n' +
        '          empty Trash permanently (not the same as orphans moving into Trash).',
    )
    .option(
      '-y, --yes',
      'For trash clear only: empty Trash immediately without the yes/no prompt',
    )
    .example(ex('trash list'))
    .example(ex('trash clear'))
    .example(ex('trash clear --yes'))
    .action(async (subcommand: string, options: { yes?: boolean }) => {
      const sub = subcommand.toLowerCase()
      if (sub === 'list') {
        log.info({ command: 'trash', sub: 'list' }, 'command_begin')
        await runTrashList()
        return
      }
      if (sub === 'clear') {
        log.info({ command: 'trash', sub: 'clear' }, 'command_begin')
        await runTrashEmpty(log, !!options.yes)
        return
      }
      outErr('Error: use trash list or trash clear.')
      process.exitCode = 1
    })

  cli
    .command(
      'cache <subcommand>',
      'size: scan + byte totals from clean config; clean: delete those paths after confirm.',
    )
    .usage(
      'cache size|measure [--browsers]\n' +
        'cache clean [--dry-run] [--browsers] [--yes]\n\n' +
        '  size | measure — Walks cache directory patterns from your whirlpool config,\n' +
        '                    shows a progress line per directory, then prints how many\n' +
        '                    paths and bytes would be removed by cache clean.\n\n' +
        '  clean — Plans the same targets, shows disk before/after, optionally asks for\n' +
        '          confirmation, then deletes (or with --dry-run, only reports size).',
    )
    .option(
      '--browsers',
      'Additionally measure/remove Chrome and Edge cache dirs under ~/Library/Application Support (can affect sessions/offline data)',
    )
    .option(
      '--dry-run',
      'clean only: compute freed bytes from planned paths without unlinking (still reads sizes)',
    )
    .option(
      '-y, --yes',
      'clean only: delete planned cache paths without the interactive confirm step',
    )
    .example(ex('cache size'))
    .example(ex('cache size --browsers'))
    .example(ex('cache clean --dry-run'))
    .action(
      async (
        subcommand: string,
        options: { browsers?: boolean; dryRun?: boolean; yes?: boolean },
      ) => {
        const sub = subcommand.toLowerCase()
        if (sub === 'size' || sub === 'measure') {
          log.info({ command: 'cache', sub: 'size' }, 'command_begin')
          await runCacheSize({ browsers: !!options.browsers })
          return
        }
        if (sub === 'clean') {
          log.info({ command: 'cache', sub: 'clean' }, 'command_begin')
          await runCacheClean({
            dryRun: !!options.dryRun,
            browsers: !!options.browsers,
            yes: !!options.yes,
          })
          return
        }
        outErr('Error: use cache size or cache clean.')
        process.exitCode = 1
      },
    )

  cli
    .command(
      'disk',
      'One-shot statfs on /: used, total, % used, and available space (same line format as other commands).',
    )
    .usage(
      'disk\n\n' +
        '  Lightweight volume summary for the boot disk. Pair with scan or cache\n' +
        '  output to compare before/after when cleaning.',
    )
    .example(ex('disk'))
    .action(async () => {
      log.info({ command: 'disk' }, 'command_begin')
      await runDisk()
    })

  cli.help()
  cli.version(CLI_VERSION)

  return cli
}
