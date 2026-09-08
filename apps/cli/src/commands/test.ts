import { run, printReport, printReportJson } from '@convkit/test-engine'
import { readdir } from 'fs/promises'
import { resolve, join } from 'path'
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
  const searchRoot = pattern.includes('*') ? process.cwd() : resolve(process.cwd(), pattern)
  const testFiles = await findTestFiles(searchRoot, pattern)

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

async function findTestFiles(dir: string, _pattern: string): Promise<string[]> {
  // Simple implementation: find all .test.ts files recursively
  // ignoring node_modules and .git
  const results: string[] = []

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
      } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
        results.push(fullPath)
      }
    }
  }

  await walk(dir)
  return results
}
