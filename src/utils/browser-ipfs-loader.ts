import { CannonRegistry, IPFSLoader } from '@usecannon/builder'
import type { Headers } from '@usecannon/builder/dist/ipfs'
import { create as createUrl, parse as parseUrl } from 'simple-url'

export class IPFSBrowserLoader extends IPFSLoader {
  constructor(
    ipfsUrl: string,
    resolver: CannonRegistry,
    customHeaders: Headers = {}
  ) {
    const { url, headers } = createIpfsUrl(ipfsUrl, '')
    super(url.replace(/\/$/, ''), resolver, { ...headers, ...customHeaders })
  }
}

// Create an ipfs url with compatibility for custom auth and https+ipfs:// protocol
function createIpfsUrl(base: string, pathname: string) {
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

// import { CannonRegistry, DeploymentInfo, IPFSLoader } from '@usecannon/builder'
// import type { Headers } from '@usecannon/builder/dist/ipfs'
// import { IPFSHTTPClient, create } from 'ipfs-http-client'

// export class IPFSBrowserLoader extends IPFSLoader {
//   private client: IPFSHTTPClient

//   constructor(
//     ipfsUrl: string,
//     resolver: CannonRegistry,
//     customHeaders: Headers = {}
//   ) {
//     super(ipfsUrl, resolver, customHeaders)

//     const url = new URL(ipfsUrl)

//     if (url.username || url.password) {
//       this.customHeaders['Authorization'] = `Basic ${btoa(
//         `${url.username}:${url.password}`
//       )}`

//       this.client = create({
//         port: Number.parseInt(url.port),
//         host: url.hostname,
//         protocol: url.protocol.replace(':', ''),
//         headers: this.customHeaders as unknown as Record<string, string>,
//       })

//       url.username = ''
//       url.password = ''

//       this.ipfsUrl = url.toString()
//     } else {
//       this.client = create({
//         url: this.ipfsUrl,
//       })
//     }
//   }

//   async putDeploy(deployInfo: DeploymentInfo) {
//     const hash = await writeIpfs(this.client, deployInfo)
//     return hash ? `${IPFSLoader.PREFIX}${hash}` : hash
//   }

//   async putMisc(misc: unknown) {
//     const hash = await writeIpfs(this.client, misc)
//     return hash ? `${IPFSLoader.PREFIX}${hash}` : hash
//   }
// }

// async function writeIpfs(client: IPFSHTTPClient, content: unknown) {
//   const data = JSON.stringify(content)
//   const { cid } = await client.add(data)
//   return cid.toString()
// }
