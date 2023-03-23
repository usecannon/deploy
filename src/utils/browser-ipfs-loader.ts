import { DeploymentInfo, IPFSLoader } from '@usecannon/builder'
import { IPFSHTTPClient, create } from 'ipfs-http-client'

export class IPFSBrowserLoader extends IPFSLoader {
  private client = create(this.ipfsUrl as unknown)

  async putDeploy(deployInfo: DeploymentInfo) {
    const hash = await writeIpfs(this.client, deployInfo)
    return hash ? `${IPFSLoader.PREFIX}${hash}` : hash
  }

  async putMisc(misc: unknown) {
    const hash = await writeIpfs(this.client, misc)
    return hash ? `${IPFSLoader.PREFIX}${hash}` : hash
  }
}

async function writeIpfs(client: IPFSHTTPClient, content: unknown) {
  const data = JSON.stringify(content)
  const { cid } = await client.add(data)
  return cid.toString()
}
