import { useEffect } from 'react';

export function toDecimal(number: number, decimals: number): string {
	return (number / 10 ** decimals).toFixed(decimals);
}

export function buildExplorerUrl(type: 'tx' | 'address', address: string) {
	return `https://solscan.io/${type}/${address}`
}
