import axios from 'axios'

export interface TenderlySettings {
  tenderlyKey: string
  tenderlyProject: string
}

const BASE_URL = 'https://api.tenderly.co/'

export async function createFork(settings: TenderlySettings, chainId: number) {
  return await axios.post(
    `${BASE_URL}/api/v2/project/${settings.tenderlyProject}/forks`,
    {
      name: `cannon-safe-app-${Date.now()}`,
      description: 'Temporary fork used by cannon-safe-app',
      network_id: chainId,
    },
    {
      headers: {
        'X-Access-Key': settings.tenderlyKey,
      },
    }
  )
}

export async function deleteFork(settings: TenderlySettings, forkId: string) {
  return await axios.delete(
    `${BASE_URL}/api/v2/project/${settings.tenderlyProject}/forks/${forkId}`,
    {
      headers: {
        'X-Access-Key': settings.tenderlyKey,
      },
    }
  )
}
