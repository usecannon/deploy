import {
    Box,
    Editable,
    EditableInput, EditablePreview, HStack, Popover, PopoverAnchor, PopoverBody, PopoverContent, PopoverTrigger, Text, VStack
} from '@chakra-ui/react'
import { useState } from 'react';

import _ from 'lodash';
import { EditableAutocompleteInput } from './EditableAutocompleteInput';
import { Address, TransactionRequestBase, encodeFunctionData, getFunctionSelector } from 'viem';

export function DisplayedTransaction(props: { contracts: { [key: string]: { address: Address, abi: any[] }}, txn?: Omit<TransactionRequestBase, 'from'>, onTxn?: (txn: Omit<TransactionRequestBase, 'from'>|null) => void, editable?: boolean }) {

    const [execContract, setExecContract] = useState('')
    const [execFunc, setExecFunc] = useState('')
    const [execFuncArgs, setExecFuncArgs] = useState([]);

    const execContractInfo = execContract ? props.contracts[execContract] : null;
    const execFuncFragment = execContractInfo && execFunc ? execContractInfo.abi.find(f => f.name === execFunc) : null;

    console.log('exec func fragment', execFuncFragment);

    function selectExecFunc(label: string) {
        if (execFunc !== label) {
            setExecFunc(label)

            const abiFragment = execContractInfo.abi.find(f => f.name === label);
    
            if (!abiFragment.inputs.length) {
                // transaction is valid
                props.onTxn({
                    to: execContractInfo.address,
                    data: getFunctionSelector(abiFragment)
                })
            }
            else {
                props.onTxn(null);
            }
        }
    }

    function updateFuncArg(arg: number, val: string) {
        while (execFuncArgs.length < execFuncFragment.inputs.length) {
            execFuncArgs.push('')
        }

        while(execFuncArgs.length > execFuncFragment.inputs.length) {
            execFuncArgs.pop()
        }

        execFuncArgs[arg] = val;
        setExecFuncArgs(_.clone(execFuncArgs));

        if (!execFuncArgs.find(a => a === '')) {
            // we have a valid transaction
            props.onTxn({
                to: execContractInfo.address,
                data: encodeFunctionData({
                    abi: [execFuncFragment],
                    args: execFuncArgs
                })
            })
        }
    }

    function generateArgOptions(arg: number) {
        if (execFuncFragment.inputs.length > arg) {

            if (execFuncFragment.inputs[arg].type.startsWith('uint') || execFuncFragment.inputs[arg].type.startsWith('int')) {
                // offer both the nubmer they are typing, and also the bigint version
                const num = execFuncArgs[arg] || '0'
                return [{ label: num, secondary: 'literal' }, { label: num + '000000000000000000', secondary: '18-decimal fixed' }]
            }

            switch (execFuncFragment.inputs[arg].type) {
                case 'bool':
                    return [{ label: 'true', secondary: '' }, { label: 'false', secondary: '' }]
                default: // bytes32, string, address
                    return [{ label: execFuncArgs[arg] || '', secondary: '' }]
            }
        }

        return [];
        //const input = 
    }

    function extractFunctionNames(contractAbi: any[]) {
  
      return contractAbi
        .filter(a => a.type === 'function' && a.stateMutability !== 'view')
        .map(a => {
          return { label: a.name, secondary: getFunctionSelector(a) }
        })
    }

    return (
        <HStack fontFamily={'monospace'} gap={0} fontSize={24}>
            <EditableAutocompleteInput color='blue' tabKeys='.' placeholder='Contract' items={Object.entries(props.contracts).map(([k,v]) => ({ label: k, secondary: v.address }))} onChange={(item) => setExecContract(item)} />
            <Text>.</Text>
            <EditableAutocompleteInput color='red' tabKeys='(' placeholder='func' items={execContract ? extractFunctionNames(execContractInfo.abi) : []} onChange={selectExecFunc} onPending={selectExecFunc} />
            <Text>(</Text>
            {(execFuncFragment?.inputs || []).map((arg, i) => ([
                <EditableAutocompleteInput color='green' tabKeys=',' placeholder={arg.name || arg.type || arg.internalType} items={generateArgOptions(i)} onFilterChange={(v) => updateFuncArg(i, v)} onChange={(v) => updateFuncArg(i, v)} />, 
                <Text>{i < execFuncFragment.inputs.length - 1 ? ',' : ''}</Text>
            ]))}
            <Text>)</Text>
        </HStack>
    )
}
  