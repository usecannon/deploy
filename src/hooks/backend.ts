import axios from "axios";
import { ethers } from "ethers";
import { useAccount, useChainId, useContractEvent, useContractRead, useContractReads, useMutation, usePrepareContractWrite, useQuery, useWalletClient } from "wagmi";
import { SafeTransaction } from "../types";

import SafeABI from '../../backend/src/abi/Safe.json';
import _ from "lodash";
import { useStore } from "../store";
import { useMemo } from "react";

const BACKEND_URL = 'http://127.0.0.1:3000';

export function useSafeTransactions() {
  const chainId = useChainId();

  const safeAddress = useStore((s) => s ? s.safeAddress.split(':')[1] : s) as `0x${string}`

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

  const staged = _.sortBy(stagedQuery.data && nonceQuery.data ? stagedQuery.data.data.filter(t => t.txn._nonce >= nonceQuery.data) : [], 'txn._nonce') as { txn: SafeTransaction, sigs: string[] }[];

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

  const account = useAccount()
  const walletClient = useWalletClient()

  const safeAddress = useStore((s) => s ? s.safeAddress.split(':')[1] : s) as `0x${string}`
  const { nonce, staged, stagedQuery } = useSafeTransactions();

  const safeTxn: SafeTransaction = {
    to: txn.to || ethers.constants.AddressZero,
    value: txn.value || '0',
    data: txn.data || '0x',
    operation: txn.operation || '0', // 0 = call, 1 = delegatecall
    safeTxGas: txn.safeTxGas || '0',
    baseGas: txn.baseGas || '0',
    gasPrice: txn.gasPrice || '0',
    gasToken: txn.gasToken || ethers.constants.AddressZero,
    refundReceiver: safeAddress,
    _nonce: staged.length ? _.last(staged).txn._nonce + 1 : Number(nonce)
  };

  console.log(staged);
  console.log('NEW NONCE', safeTxn._nonce);

  // try to match with an existing transaction
  const alreadyStaged = staged.find(s => _.isEqual(s.txn, safeTxn));

  const reads = useContractReads(
    {
      contracts: [
        {
          abi: SafeABI as any,
          address: safeAddress,
          functionName: 'getTransactionHash',
          args: [
            safeTxn.to, 
            safeTxn.value, 
            safeTxn.data, 
            safeTxn.operation, 
            safeTxn.safeTxGas, 
            safeTxn.baseGas, 
            safeTxn.gasPrice, 
            safeTxn.gasToken, 
            safeTxn.refundReceiver, 
            safeTxn._nonce
          ],
        },
        {
          abi: SafeABI as any,
          address: safeAddress,
          functionName: 'getThreshold',
        },
        {
          abi: SafeABI as any,
          address: safeAddress,
          functionName: 'isOwner',
          args: [account.address]
        }
      ],
    }
  );

  const hashToSign = reads.isSuccess ? reads.data[0].result as unknown as `0x${string}` : null;

  const alreadyStagedSigners = useMemo(() => {
    if (!hashToSign || !alreadyStaged) {
      return [];
    }

    const signers = [];
    for (const sig of alreadyStaged.sigs) {
      const regularSig = ethers.utils.arrayify(sig);
      regularSig[regularSig.length - 1] -= 4;
      signers.push(ethers.utils.verifyMessage(ethers.utils.arrayify(hashToSign), regularSig));
    }

    return signers;
  }, [alreadyStaged?.sigs, hashToSign]);

  const sigInsertIdx = _.sortedIndex(alreadyStagedSigners.map(s => s.toLowerCase()), account.address.toLowerCase());

  const mutation = useMutation({
    mutationFn: async ({txn, sig}: { txn: SafeTransaction, sig: string }) => {
      // see if there is a currently staged transaction matching ours
      if (!stagedQuery.isSuccess) {
        return;
      }

      const newStaged = _.cloneDeep(alreadyStaged) || { txn, sigs: [] };
      newStaged.sigs.splice(sigInsertIdx, 0, sig);

      return await axios.post(`${BACKEND_URL}/${chainId}/${safeAddress}`, newStaged);
    },
    onSuccess: async () => {
      stagedQuery.refetch()
    }
  });

  const requiredSigs = reads.isSuccess ? reads.data[1].result as unknown as bigint : 0

  const execSig: string[] = _.clone(alreadyStaged?.sigs || []);
  if (alreadyStagedSigners.length < requiredSigs) {

    execSig.splice(sigInsertIdx, 0, ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [account.address, 0]) + '01');
  }
  
  const stageTxnMutate = usePrepareContractWrite({
    abi: SafeABI as any,
    address: safeAddress,
    functionName: 'execTransaction',
    args: [
      safeTxn.to, 
      safeTxn.value, 
      safeTxn.data, 
      safeTxn.operation, 
      safeTxn.safeTxGas, 
      safeTxn.baseGas, 
      safeTxn.gasPrice, 
      safeTxn.gasToken, 
      safeTxn.refundReceiver, 
      '0x' + execSig.map(s => s.slice(2)).join('')
    ],
  })

  // types seem to be busted for results that come back from wagmi when it cant very well parse into the abi

  // must not have already signed in order to sign
  const existingSigsCount = (alreadyStaged ? alreadyStaged.sigs.length : 0);
  const isSigner = reads.isSuccess && !reads.isFetching && !reads.isRefetching ? reads.data[2].result as unknown as boolean : false;
  const canSign = isSigner && walletClient.data && alreadyStagedSigners.indexOf(account.address) === -1;
  const canExecute = reads.isSuccess && !reads.isFetching && !reads.isRefetching ?
    (
      (canSign && existingSigsCount + 1 >= requiredSigs) || 
      (isSigner && existingSigsCount >= requiredSigs)
    ) : false;

  return {
    isSigner,
    canSign,
    canExecute,

    sign: async () => {
      const signature = await walletClient.data.signMessage({ account: account.address, message: { raw: hashToSign } })

      // gnosis for some reason requires adding 4 to the signature version code
      const gnosisSignature = ethers.utils.arrayify(signature);
      gnosisSignature[gnosisSignature.length - 1] += 4;

      await mutation.mutate({ txn: safeTxn, sig: ethers.utils.hexlify(gnosisSignature) });
    },

    signMutation: mutation,

    existingSigners: alreadyStagedSigners,

    executeTxnConfig: stageTxnMutate.config
  }
}