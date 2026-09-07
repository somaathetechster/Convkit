import type { TestConfig, ScenarioResult, TestReport } from './types.js'
import { TestContext } from './context.js'

type ScenarioFn = (ctx: TestContext) => Promise<void>

interface Scenario {
  name: string
  fn: ScenarioFn
  userMetadata?: Record<string, unknown>
}

const scenarios: Scenario[] = []

export function scenario(
  name: string,
  fn: ScenarioFn,
  options?: { metadata?: Record<string, unknown> }
): void {
  scenarios.push({ name, fn, userMetadata: options?.metadata })
}

export async function run(config: TestConfig): Promise<TestReport> {
  const start = Date.now()
  const results: ScenarioResult[] = []

  for (const s of scenarios) {
    const scenarioStart = Date.now()

    // Register the bot
    await fetch(`${config.serverUrl}/api/v1/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-bot', webhookUrl: config.botWebhookUrl })
    })

    // Create a fresh user for each scenario
    const userRes = await fetch(`${config.serverUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `test-${s.name}`,
        phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        country: 'US',
        metadata: s.userMetadata ?? {}
      })
    })

    const { user, session } = await userRes.json() as any
    const ctx = new TestContext(config, user.id, session.id)

    try {
      await s.fn(ctx)
      results.push({
        name: s.name,
        passed: ctx.steps.every(step => step.passed),
        steps: ctx.steps,
        duration: Date.now() - scenarioStart
      })
    } catch (err: any) {
      results.push({
        name: s.name,
        passed: false,
        steps: ctx.steps,
        duration: Date.now() - scenarioStart,
        error: err.message
      })
    }
  }

  const passing = results.filter(r => r.passed).length
  const failing = results.length - passing

  return {
    passed: failing === 0,
    total: results.length,
    passing,
    failing,
    duration: Date.now() - start,
    scenarios: results
  }
}
