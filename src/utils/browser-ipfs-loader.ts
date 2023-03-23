import { IPFSLoader } from '@usecannon/builder'

export class IPFSBrowserLoader extends IPFSLoader {}

// import { CannonRegistry, IPFSLoader } from '@usecannon/builder'
// import type { Headers } from '@usecannon/builder/dist/ipfs'

// export class IPFSBrowserLoader extends IPFSLoader {
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

//       url.username = ''
//       url.password = ''

//       this.ipfsUrl = url.toString()
//     }
//   }
// }

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
