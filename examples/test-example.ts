import { scenario, run, printReport } from '@convkit/test-engine'

const config = {
  serverUrl: 'http://localhost:4000',
  botWebhookUrl: 'http://localhost:5000/webhook',
  timeoutMs: 5000,
  stepDelayMs: 400
}

scenario('hello flow', async (ctx) => {
  await ctx.send('hello')
  await ctx.expect.text('Welcome')
  await ctx.expect.buttons(['Features', 'About', 'Help'])
})

scenario('ping flow', async (ctx) => {
  await ctx.send('ping')
  await ctx.expect.text('Pong')
})

scenario('help flow', async (ctx) => {
  await ctx.send('help')
  await ctx.expect.list({ sections: ['Commands', 'Info'] })
})

scenario('button click flow', async (ctx) => {
  await ctx.send('hello')
  await ctx.expect.buttons(['Features', 'About', 'Help'])
  await ctx.click('Features')
  await ctx.expect.list()
})

scenario('status with metadata', async (ctx) => {
  await ctx.send('status')
  await ctx.expect.text('No state set')
}, { metadata: {} })

scenario('status with injected metadata', async (ctx) => {
  await ctx.send('status')
  await ctx.expect.text('plan')
}, { metadata: { plan: 'premium', role: 'admin' } })

const report = await run(config)
printReport(report)
process.exit(report.passed ? 0 : 1)
