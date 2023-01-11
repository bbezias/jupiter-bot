import fs from 'fs';
import {
	Connection, LAMPORTS_PER_SOL,
	TokenBalance,
	VersionedTransactionResponse
} from "@solana/web3.js";
import { SwapError } from "./swap";

export function storeItInTempAsJSON(data: any, path = './temp.json') {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

export async function getSwapResultFromRPCParser(
  txId: string,
  signer: string,
  tokenAddressA: string,
  tokenAddressB: string,
  connection: Connection
): Promise<{inputAmount: number, outAmount: number, fee?: number}> {
  let t: VersionedTransactionResponse | null = null;
  for (let i = 0; i < 10; i++) {
    t = await connection.getTransaction(txId, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (t) {
      break;
    }

    await new Promise(f => setTimeout(f, 2000));
  }

  if (!t) {
    throw new SwapError(
      'Impossible to find the transaction after 10 queries',
      'notConfirmed',
      undefined,
      txId
    );
  }

  const err: any = t.meta?.err;
  const fee = t.meta ? t.meta.fee / LAMPORTS_PER_SOL : 0;
  if (err) {
		if (process.env.DEBUG) storeItInTempAsJSON(t, `errors/undefined_error_trade_${txId}`);
    if (
      typeof err === 'object' &&
      err.InstructionError &&
      err.InstructionError[1].Custom === 6001
    ) {
      throw new SwapError(
        'Slippage Threshold breached' as string,
        'slippage',
        fee,
        txId
      );
    }
    throw new SwapError(err.toString(), 'unknown', fee, txId);
  }

  const preToken = t.meta?.preTokenBalances as TokenBalance[];
  const postToken = t.meta?.postTokenBalances as TokenBalance[];

	console.log(postToken);
	console.log('Mint', tokenAddressB, 'signer', signer);

  const tokenABalancePre = preToken.find(
    o => o.mint === tokenAddressA && o.owner === signer
  );
  const tokenABalancePost = postToken.find(
    o => o.mint === tokenAddressA && o.owner === signer
  );
  const tokenBBalancePre = preToken.find(
    o => o.mint === tokenAddressB && o.owner === signer
  );
  const tokenBBalancePost = postToken.find(
    o => o.mint === tokenAddressB && o.owner === signer
  );

  if (
    !tokenABalancePre ||
    !tokenBBalancePre ||
    !tokenABalancePost ||
    !tokenBBalancePost
  ) {
    throw new SwapError(
      'Cannot find the pre/post balance in the conversion',
      'internalError',
      fee,
      txId
    );
  }

  const preAmountA = +tokenABalancePre.uiTokenAmount.amount || 0;
  const postAmountA = +tokenABalancePost.uiTokenAmount.amount || 0;
  const preAmountB = +tokenBBalancePre.uiTokenAmount.amount || 0;
  const postAmountB = +tokenBBalancePost.uiTokenAmount.amount || 0;

  const amountA = preAmountA - postAmountA;
  const amountB = postAmountB - preAmountB;

	console.log(+tokenBBalancePre.uiTokenAmount.amount || 0, +tokenBBalancePost.uiTokenAmount.amount || 0, amountB);

  return {inputAmount: amountA, outAmount: amountB, fee: fee};
}

export async function getSwapResultFromRPCParserArbitrage(
  txId: string,
  signer: string,
  tokenAddress: string,
	amountInit: number,
  connection: Connection
): Promise<{inputAmount: number, outAmount: number, fee?: number}> {
  let t: VersionedTransactionResponse | null = null;
  for (let i = 0; i < 20; i++) {
    t = await connection.getTransaction(txId, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (t) {
      break;
    }

    await new Promise(f => setTimeout(f, 2000));
  }

  if (!t) {
    throw new SwapError(
      'Impossible to find the transaction after 10 queries',
      'notConfirmed',
      undefined,
      txId
    );
  }

  storeItInTempAsJSON(t, './temp.json');

  const err: any = t.meta?.err;
	const fee = t.meta ? t.meta.fee / LAMPORTS_PER_SOL : 0;
  if (err) {
		if (process.env.DEBUG) storeItInTempAsJSON(t, `errors/undefined_error_trade_${txId}`);
    if (
      typeof err === 'object' &&
      err.InstructionError &&
      err.InstructionError[1].Custom === 6001
    ) {
      throw new SwapError(
        'Slippage Threshold breached' as string,
        'slippage',
        fee,
        txId
      );
    }
    throw new SwapError(err.toString(), 'unknown', fee, txId);
  }

  const preToken = t.meta?.preTokenBalances as TokenBalance[];
  const postToken = t.meta?.postTokenBalances as TokenBalance[];

  const tokenBalancePre = preToken.find(
    o => o.mint === tokenAddress && o.owner === signer
  );
  const tokenBalancePost = postToken.find(
    o => o.mint === tokenAddress && o.owner === signer
  );

  if (
    !tokenBalancePre ||
    !tokenBalancePost
  ) {
    throw new SwapError(
      'Cannot find the pre/post balance in the conversion',
      'internalError',
      fee,
      txId
    );
  }

  const preAmountA = +tokenBalancePre.uiTokenAmount.amount || 0;
  const postAmountA = +tokenBalancePost.uiTokenAmount.amount || 0;

  const amountPost = postAmountA - preAmountA + amountInit;

	return {inputAmount: amountInit, outAmount: amountPost, fee: fee};
}
