import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  Hex,
  TransactionRequestBase,
  createPublicClient,
  createWalletClient,
  custom,
} from 'viem'
import { createFork } from '../utils/rpc'
import { SafeDefinition } from '../store'
import { EthereumProvider } from 'ganache'

type SimulatedTransactionResult = {
  gasUsed: bigint
  callResult: Hex
  error?: string
}

// TODO: this probably shuoldn't be global, but it probably also shouldn't be state.
// its a risk if 2 `useSimulatedTxns` are in use at the same time
let node: EthereumProvider | null = null

export function useSimulatedTxns(
  safe: SafeDefinition,
  txns: (Omit<TransactionRequestBase, 'from'> | null)[]
) {
  const [txnResults, setTxnResults] = useState<
    (SimulatedTransactionResult | null)[]
  >([])
  const [cleanStateSnapshot, setCleanStateSnapshot] = useState(null)
  const [computedTxns, setComputedTxns] = useState(null)

  const runTxns = async () => {
    console.log('starting fork simulate')
    const results: (SimulatedTransactionResult | null)[] = []
    const transport = custom(node)
    const client = createWalletClient({ transport })
    const publicClient = createPublicClient({ transport })

    for (const txn of txns) {
      if (!txn) {
        results.push(null)
      }

      try {
        const rawEthCall = await node.request({
          method: 'eth_call',
          params: [{ from: safe.address, to: txn.to, data: txn.data }],
        })

        const hash = await node.request({
          method: 'eth_sendTransaction',
          params: [{ from: safe.address, to: txn.to, data: txn.data }],
        })

        const receipt = await node.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })

        //const receipt = await publicClient.waitForTransactionReceipt({ hash })

        results.push({
          gasUsed: BigInt(receipt.gasUsed),
          callResult: rawEthCall as Hex,
        })
      } catch (err) {
        // record error and continue to try to execute more txns
        console.log('full txn error', err, txn)
        results.push({
          gasUsed: 0n,
          callResult: err.data,
          error: err.toString(),
        })
      }
    }

    setTxnResults(results)
  }

  useEffect(() => {
    createFork({ chainId: safe.chainId, impersonate: [safe.address] }).then(
      async (n) => {
        node = n
        setCleanStateSnapshot(
          await node.request({ method: 'evm_snapshot', params: [] })
        )
        console.log('finished creating fork')
      }
    )
  }, [safe])

  useEffect(() => {
    if (cleanStateSnapshot && JSON.stringify(txns) !== computedTxns) {
      setCleanStateSnapshot(null)
      node.send('evm_revert', [cleanStateSnapshot]).then(async () => {
        const newCleanState = await node.request({
          method: 'evm_snapshot',
          params: [],
        })
        try {
          await runTxns()
        } catch (err) {}

        setComputedTxns(JSON.stringify(txns))
        setCleanStateSnapshot(newCleanState)
      })
    }
    // cant do anything until its done with current simulation
  }, [txns, cleanStateSnapshot])

  return {
    txnResults,
  }
}
