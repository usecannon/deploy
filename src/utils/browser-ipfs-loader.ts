import axios from 'axios'
import pako from 'pako'
import { DeploymentInfo, IPFSLoader } from '@usecannon/builder'
import type { Headers } from '@usecannon/builder/dist/ipfs'
import { create as createUrl, parse as parseUrl } from 'simple-url'

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

  formData.append('data', buff)

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
