

/*
contract Storage {
    mapping(address => mapping(bytes32 => bytes32)) store;

    function set(bytes32 k, bytes32 v) external {
        store[msg.sender][k] = v;
    }

    function get(bytes32 k) external view returns (bytes32) {
        return store[msg.sender][k];
    }

    function getWithAddress(address s, bytes32 k) external view returns (bytes32) {
        return store[s][k];
    }
}
*/

import { zeroPad } from "ethers/lib/utils"
import { Hex, TransactionRequestBase } from "viem"

export const bytecode = '608060405234801561001057600080fd5b5061018b806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80638eaa6ac014610046578063aa18513514610081578063f71f7a25146100b5575b600080fd5b61006f6100543660046100e2565b33600090815260208181526040808320938352929052205490565b60405190815260200160405180910390f35b61006f61008f3660046100fb565b6001600160a01b0391909116600090815260208181526040808320938352929052205490565b6100e06100c3366004610133565b336000908152602081815260408083209483529390529190912055565b005b6000602082840312156100f457600080fd5b5035919050565b6000806040838503121561010e57600080fd5b82356001600160a01b038116811461012557600080fd5b946020939093013593505050565b6000806040838503121561014657600080fd5b5050803592602090910135915056fea2646970667358221220570ff9c318d353a272f344e0a54a094ac1fb2ffac6965ff8be766eff8d87254464736f6c63430008130033'

export const ABI = [
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "k",
				"type": "bytes32"
			}
		],
		"name": "get",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "s",
				"type": "address"
			},
			{
				"internalType": "bytes32",
				"name": "k",
				"type": "bytes32"
			}
		],
		"name": "getWithAddress",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "k",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "v",
				"type": "bytes32"
			}
		],
		"name": "set",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

export const deployTxn: Partial<TransactionRequestBase> = {
    to: '0x3fab184622dc19b6109349b94811493bf2a45362',
    data: zeroPad('0x', 32) + bytecode as Hex
}

export const deployAddress = '0x6996808960e52d3ec7fc4d3983477d94b85ff8d4'