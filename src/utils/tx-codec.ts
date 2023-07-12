import type { Abi, AbiFunction } from 'abitype'
import { getFunctionSelector } from 'viem'

export function extractFunctionNames(contractAbi: Abi) {
  return contractAbi.filter(isViewFunction).map((a) => {
    return { label: a.name, secondary: getFunctionSelector(a) }
  })
}

export function isViewFunction(item: Abi[number]): item is AbiFunction {
  return item.type === 'function' && item.stateMutability !== 'view'
}
