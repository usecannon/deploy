import axios from "axios";
import { ethers } from "ethers";
import { useChainId, useContractEvent, useContractRead, useContractReads, useMutation, useQuery, useSignMessage } from "wagmi";
import { SafeTransaction } from "../types";

import SafeABI from '../../backend/src/abi/Safe.json';
import _ from "lodash";

const BACKEND_URL = 'http://127.0.0.1:1234';

export function useSafeTransactions() {
  const chainId = useChainId();

  const safeAddress = '0x';


  const nonceQuery = useContractRead({
    abi: SafeABI,
    address: safeAddress,
    functionName: 'nonce',
  })
  
  const stagedQuery = useQuery(['staged', chainId, safeAddress], { queryFn: async () => axios.get(`${BACKEND_URL}/${chainId}/${safeAddress}`)});

  // how to query historical events with wagmi? idk
  /*const historySuccessQuery = useContractEvent({
    abi: SafeABI,
    address: safeAddress,
    eventName: 'ExecutionSuccess',
    listener: () => {}
  });

  const historyFailedQuery = useContractEvent({
    abi: SafeABI,
    address: safeAddress,
    eventName: 'ExecutionFailure',
    listener: () => {}
  })*/

  const staged = _.sortBy(stagedQuery.data.data, 'txn._nonce') as { txn: SafeTransaction, sigs: string[] }[];

  return {
    nonceQuery,
    stagedQuery,
    //historyQuery,
    nonce: nonceQuery.data as bigint,
    staged,
    history: [],
  }
}

export function useTxnStager(txn: Partial<SafeTransaction>) {
  const chainId = useChainId();

  const safeAddress = '0x';
  const { nonce, staged, stagedQuery } = useSafeTransactions();

  const safeTxn: SafeTransaction = _.assign({
    to: ethers.constants.AddressZero,
    value: '0',
    data: '0x',
    operation: '',
    safeTxGas: 0,
    baseGas: '0',
    gasPrice: '0',
    gasToken: ethers.constants.AddressZero,
    refundReceiver: safeAddress,
    _nonce: _.last(staged) ? _.last(staged).txn._nonce : nonce
  }, txn);

  // try to match with an existing transaction
  const alreadyStaged = staged.find(s => _.isEqual(s.txn, safeTxn));

  const mutation = useMutation({
    mutationFn: async ({txn, sig}: { txn: SafeTransaction, sig: string }) => {
      // see if there is a currently staged transaction matching ours
      if (!stagedQuery.isSuccess) {
        return;
      }

      const newStaged = _.cloneDeep(alreadyStaged) || { txn, sigs: [] };
      newStaged.sigs.push(sig);

      return await axios.post(`${BACKEND_URL}/${chainId}/${safeAddress}`, newStaged);
    }
  });

  const reads = useContractReads(
    {
      contracts: [
        {
          //abi: SafeABI,
          address: safeAddress,
          functionName: 'getTransactionHash',
          args: [txn]
        },
        {
          //abi: SafeABI,
          address: safeAddress,
          functionName: 'getThreshold',
        }
      ],
    }
  );

  const sigCall = useSignMessage({
    message: reads.data[0].result as string
  });

  // must not have already signed in order to sign
  const canSign = true;
  const canExecute = (canSign && alreadyStaged.sigs.length + 1 >= (reads.data[1].result as bigint) && reads.data[1].result) || alreadyStaged.sigs.length >= (reads.data[1].result as bigint);

  return {
    canSign,
    canExecute,

    sign: async () => {
      const signature = await sigCall.signMessageAsync();
      await mutation.mutate({ txn: safeTxn, sig: signature });
    },


    execute: () => {

    }
  }
}