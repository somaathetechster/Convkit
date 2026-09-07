import type { TestReport } from './types.js'

export function printReport(report: TestReport): void {
  console.log('')
  console.log('Convkit Test Report')
  console.log('─'.repeat(50))

  for (const scenario of report.scenarios) {
    const icon = scenario.passed ? '✓' : '✗'
    console.log('')
    console.log(`${icon} ${scenario.name} (${scenario.duration}ms)`)

    for (const step of scenario.steps) {
      const stepIcon = step.passed ? '  ✓' : '  ✗'
      console.log(`${stepIcon} ${step.step} (${step.duration}ms)`)
      if (!step.passed && step.error) {
        console.log(`      Error: ${step.error}`)
      }
    }

    if (!scenario.passed && scenario.error && scenario.steps.every(s => s.passed)) {
      console.log(`  ✗ ${scenario.error}`)
    }
  }

  console.log('')
  console.log('─'.repeat(50))
  console.log(`${report.passing}/${report.total} scenarios passed  (${report.duration}ms)`)
  console.log('')
}

export function printReportJson(report: TestReport): void {
  console.log(JSON.stringify(report, null, 2))
}
