import { SafeAppProvider } from '@safe-global/safe-apps-provider'

export class SkippedTransaction extends Error {
  method: string
  params: unknown[]

  constructor(method: string, params: unknown[]) {
    super('Skipped Transaction')
    this.method = method
    this.params = params
  }
}

export class ReadOnlySafeAppProvider extends SafeAppProvider {
  async request({ method, params }) {
    if (method === 'eth_sendTransaction') {
      throw new SkippedTransaction(method, params)
    }

    return super.request({ method, params })
  }
}
