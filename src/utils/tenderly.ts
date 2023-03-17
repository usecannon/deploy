import axios from 'axios'

interface TenderlySettings {
  tenderlyKey: string
  tenderlyProject: string
}

const BASE_URL = 'https://api.tenderly.co'

interface ForkData {
  id: string
  json_rpc_url: string
  name: string
  block_number: string
  network_id: string
  description: string
  accounts: {
    [address: string]: string
  }
  details: {
    chain_config: {
      chain_id: string
    }
  }
}

export async function createFork(settings: TenderlySettings, chainId: number) {
  const res = await axios.post(
    `${BASE_URL}/api/v2/project/${settings.tenderlyProject}/forks`,
    {
      name: `cannon-safe-app-${Date.now()}`,
      description: 'Temporary fork used by cannon-safe-app',
      network_id: chainId,
    },
    { headers: { 'X-Access-Key': settings.tenderlyKey } }
  )

  if (res.status !== 200 || !res.data?.fork) {
    throw new Error('Invalid tenderly response')
  }

  return res.data.fork as ForkData
}

export async function deleteFork(settings: TenderlySettings, forkId: string) {
  return await axios.delete(
    `${BASE_URL}/api/v2/project/${settings.tenderlyProject}/forks/${forkId}`,
    { headers: { 'X-Access-Key': settings.tenderlyKey } }
  )
}
