import { SafeAppProvider } from '@safe-global/safe-apps-provider';

export class ReadOnlySafeAppProvider extends SafeAppProvider {
  async request({ method, params }) {
    if (method === 'eth_sendTransaction') {
      console.log(`  skip:`, method, ...params)
      return;
    }

    return super.request({ method, params })
  }
}
