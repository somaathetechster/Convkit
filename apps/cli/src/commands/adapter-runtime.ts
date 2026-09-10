export type AdapterName = 'infobip' | 'meta'

export interface AdapterOptions {
  name: AdapterName
  botUrl: string
  port: number
}

export interface RunningAdapter {
  endpoint: string
  listen(): void
  close(): void
}

type AdapterInstance = { listen(): void; close(): void }
type AdapterConstructor = new (config: {
  convkitUrl: string
  botWebhookUrl: string
  port: number
}) => AdapterInstance

const adapters: Record<AdapterName, string> = {
  infobip: '@convkit/adapter-infobip',
  meta: '@convkit/adapter-meta'
}

export async function createAdapter(options: AdapterOptions, convkitUrl = 'http://localhost:4000'): Promise<RunningAdapter> {
  const module = await import(adapters[options.name]) as { InfobipAdapter?: AdapterConstructor; MetaAdapter?: AdapterConstructor }
  const Adapter = (module.InfobipAdapter ?? module.MetaAdapter)!
  const adapter = new Adapter({
    convkitUrl,
    botWebhookUrl: options.botUrl,
    port: options.port
  })

  return {
    endpoint: `http://localhost:${options.port}/webhook`,
    listen: () => adapter.listen(),
    close: () => adapter.close()
  }
}

export function supportedAdapters(): string {
  return Object.keys(adapters).join(', ')
}
