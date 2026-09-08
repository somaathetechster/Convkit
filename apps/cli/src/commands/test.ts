import { run, printReport, printReportJson } from '@convkit/test-engine'
import { readdir } from 'fs/promises'
import { statSync } from 'fs'
import { resolve, join, basename } from 'path'
import { pathToFileURL } from 'url'

export async function testCommand(flags: string[]): Promise<void> {
  // Parse flags
  let serverUrl = 'http://localhost:4000'
  let botUrl = 'http://localhost:5000/webhook'
  let timeoutMs = 5000
  let outputJson = false
  let pattern = '**/*.test.ts'

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--server' && flags[i + 1]) serverUrl = flags[++i]!
    else if (flags[i] === '--bot' && flags[i + 1]) botUrl = flags[++i]!
    else if (flags[i] === '--timeout' && flags[i + 1]) timeoutMs = Number(flags[++i])
    else if (flags[i] === '--json') outputJson = true
    else if (flags[i] === '--headless') { /* no-op for now, server handles headless */ }
    else if (!flags[i]!.startsWith('--')) pattern = flags[i]!
  }

  // Check server is reachable
  try {
    const res = await fetch(`${serverUrl}/health`)
    if (!res.ok) throw new Error()
  } catch {
    console.error(`Cannot reach Convkit server at ${serverUrl}`)
    console.error('Start the server first: convkit server')
    process.exit(1)
  }

  // Find test files
  const testFiles = await findTestFiles(pattern, pattern)

  if (testFiles.length === 0) {
    console.log('No test files found.')
    console.log(`Pattern: ${pattern}`)
    console.log('Create a file ending in .test.ts to get started.')
    process.exit(0)
  }

  if (!outputJson) {
    console.log(`Found ${testFiles.length} test file${testFiles.length === 1 ? '' : 's'}`)
    for (const f of testFiles) console.log(`  ${f}`)
    console.log('')
  }

  // Import test files — this registers scenarios via the scenario() calls at module level
  for (const file of testFiles) {
    await import(pathToFileURL(resolve(file)).href)
  }

  // Run all registered scenarios
  const config = { serverUrl, botWebhookUrl: botUrl, timeoutMs }
  const report = await run(config)

  if (outputJson) {
    printReportJson(report)
  } else {
    printReport(report)
  }

  process.exit(report.passed ? 0 : 1)
}

async function findTestFiles(dir: string, pattern: string): Promise<string[]> {
  // Simple implementation: find all .test.ts files recursively
  // ignoring node_modules and .git
  const results: string[] = []
  const root = resolveWalkRoot(dir)
  const nameFilter = filenameFilter(pattern)

  async function walk(current: string): Promise<void> {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.test.ts') && matches(entry.name, nameFilter)) {
        results.push(fullPath)
      }
    }
  }

  await walk(root)
  return results
}

// A positional argument is either a directory to walk or a filename hint.
// Directories become the walk root; anything glob-like or .ts-suffixed keeps
// process.cwd() (or its own leading directory) as the root and filters by name.
function resolveWalkRoot(dir: string): string {
  if (!dir || dir.includes('*')) {
    const leading = dir.split('*')[0] ?? ''
    const prefix = leading.includes('/') ? leading.slice(0, leading.lastIndexOf('/')) : ''
    return prefix ? resolve(process.cwd(), prefix) : process.cwd()
  }
  if (dir.endsWith('.ts')) {
    const prefix = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : ''
    return prefix ? resolve(process.cwd(), prefix) : process.cwd()
  }
  if (dir.startsWith('.') || dir.startsWith('/') || dir.includes('/') || isDirectory(dir)) {
    return resolve(process.cwd(), dir)
  }
  return process.cwd()
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(resolve(process.cwd(), candidate)).isDirectory()
  } catch {
    return false
  }
}

// '' means "no filtering"; otherwise match the basename, treating * as a wildcard.
function filenameFilter(pattern: string): string {
  if (!pattern) return ''
  if (!pattern.includes('*') && !pattern.endsWith('.ts')) return ''
  return basename(pattern)
}

function matches(fileName: string, filter: string): boolean {
  if (!filter || filter === '*') return true
  if (!filter.includes('*')) return fileName === filter || fileName.endsWith(filter)
  return filter
    .split('*')
    .filter(Boolean)
    .every(part => fileName.includes(part))
}
