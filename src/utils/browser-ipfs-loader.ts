import axios from 'axios'
import pako from 'pako'
import { Buffer } from 'buffer'
import { CannonRegistry, DeploymentInfo, IPFSLoader } from '@usecannon/builder'
import type { Headers } from '@usecannon/builder/dist/ipfs'
import { create as createUrl, parse as parseUrl } from 'simple-url'

export class InMemoryRegistry extends CannonRegistry {
  readonly pkgs: { [name: string]: { [variant: string]: string } } = {}

  count = 0

  async publish(
    packagesNames: string[],
    variant: string,
    url: string
  ): Promise<string[]> {
    const receipts: string[] = []
    for (const name of packagesNames) {
      if (!this.pkgs[name]) {
        this.pkgs[name] = {}
      }

      this.pkgs[name][variant] = url
      receipts.push((++this.count).toString())
    }

    return receipts
  }

  async getUrl(packageRef: string, variant: string): Promise<string | null> {
    const baseResolved = await super.getUrl(packageRef, variant)
    if (baseResolved) {
      return baseResolved
    }

    return this.pkgs[packageRef][variant]
  }
}

export class FallbackRegistry implements CannonRegistry {
  readonly registries: CannonRegistry[]

  constructor(registries: CannonRegistry[]) {
    this.registries = registries
  }

  async getUrl(packageRef: string, variant: string): Promise<string | null> {
    for (const registry of this.registries) {
      try {
        const result = await registry.getUrl(packageRef, variant)
        if (result) return result
      } catch (err) {
        if (registry === this.registries[this.registries.length - 1]) throw err
        console.warn('WARNING: error caught in registry:', err)
      }
    }

    return null
  }

  async publish(
    packagesNames: string[],
    variant: string,
    url: string
  ): Promise<string[]> {
    console.log('publish to fallback database: ', packagesNames)
    // the fallback registry is usually something easy to write to or get to later
    return this.registries[0].publish(packagesNames, variant, url)
  }
}

export class IPFSBrowserLoader extends IPFSLoader {
  async putDeploy(deployInfo: DeploymentInfo) {
    const hash = await _writeIpfs(
      this.ipfsUrl,
      JSON.stringify(deployInfo),
      this.customHeaders
    )
    return hash ? `${IPFSLoader.PREFIX}${hash}` : hash
  }

  async putMisc(misc: unknown) {
    const hash = await _writeIpfs(
      this.ipfsUrl,
      JSON.stringify(misc),
      this.customHeaders
    )
    return hash ? `${IPFSLoader.PREFIX}${hash}` : hash
  }
}

async function _writeIpfs(
  ipfsUrl: string,
  content: string,
  customHeaders: Headers = {}
) {
  if (!content) throw new Error('No content to upload')

  const { url, headers } = _createIpfsUrl(ipfsUrl, '/api/v0/add')
  const formData = new FormData()

  const buff = pako.deflate(content)

  formData.append('data', Buffer.from(buff))

  const res = await axios.post(url, formData, {
    headers: { ...headers, ...customHeaders },
  })

  console.log('uploaded', res.statusText, res.data.Hash)

  return res.data.Hash
}

// Create an ipfs url with compatibility for custom auth and https+ipfs:// protocol
function _createIpfsUrl(base: string, pathname: string) {
  const parsedUrl = parseUrl(base)
  const headers: { [k: string]: string } = {}

  const customProtocol = parsedUrl.protocol.endsWith('+ipfs')

  const uri = {
    protocol: customProtocol
      ? parsedUrl.protocol.split('+')[0]
      : parsedUrl.protocol,
    host:
      customProtocol && !parsedUrl.host.includes(':')
        ? `${parsedUrl.host}:5001`
        : parsedUrl.host,
    pathname,
    query: parsedUrl.query,
    hash: parsedUrl.hash,
  }

  if (parsedUrl.auth) {
    const [username, password] = parsedUrl.auth.split(':')
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`
  }

  return { url: createUrl(uri), headers }
}
