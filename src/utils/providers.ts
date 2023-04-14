import {
  CannonWrapperGenericProvider,
  ChainArtifacts,
} from '@usecannon/builder'
import { ethers } from 'ethers'

export class ReadOnlyProvider extends CannonWrapperGenericProvider {
  constructor(jsonRpcUrl: string) {
    console.log('ReadOnlyProvider: ', jsonRpcUrl)
    super({}, new ethers.providers.JsonRpcProvider(jsonRpcUrl))
  }

  // async sendTransaction(sendTransaction: any) {
  //   console.log('sendTransaction: ', sendTransaction)
  //   return super.sendTransaction(sendTransaction)
  // }

  // async call(
  //   transaction: Deferrable<ethers.providers.TransactionRequest>,
  //   blockTag?: BlockTag | Promise<BlockTag>
  // ) {
  //   console.log('call: ', transaction, blockTag)
  //   return super.call(transaction, blockTag)
  // }

  async send(method: string, params: Array<unknown>) {
    console.log('send: ', method, params)
    return super.send(method, params)
  }

  // async perform(method: string, params: Array<unknown>) {
  //   console.log('perform: ', method, params)
  //   return super.perform(method, params)
  // }
}
