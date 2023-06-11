export type SafeTransaction = {
    to: string;
    value: string;
    data: string;
    operation: string;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    _nonce: number;
};

export type StagedTransaction = {
    txn: SafeTransaction;
    sigs: string[];
}