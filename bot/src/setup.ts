import * as fs from "fs";
import bs58 from "bs58";
import { Jupiter } from "@jup-ag/core";
import { Wallet } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import JSBI from "jsbi";
import cache from "./cache";
import ws from "./ws";

function loadRpcList() {
	const rpcList = JSON.parse(fs.readFileSync('./data/rpc_list.json', 'utf8'));
	cache.lastRpcUsed += 1;
	if (cache.lastRpcUsed >= rpcList.length) {
		cache.lastRpcUsed = 0;
	}
	cache.config.rpc = [rpcList[cache.lastRpcUsed]];
	console.log('Choosing RPC: ', cache.config.rpc);
}

export async function setup(): Promise<{
	jupiter: any;
}> {
	let wallet;
	try {

		loadRpcList();
		ws.sendConfig();

		// check wallet private key
		try {
			ws.sendInfo("Checking wallet...");
			if (
				!process.env.SOLANA_WALLET_PRIVATE_KEY ||
				(process.env.SOLANA_WALLET_PUBLIC_KEY &&
					process.env.SOLANA_WALLET_PUBLIC_KEY?.length !== 88)
			) {
				throw new Error("Wallet check failed!");
			} else {
				wallet = Keypair.fromSecretKey(
					bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY)
				);
				cache.anchorWallet = new Wallet(
					Keypair.fromSecretKey(
						bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY)
					)
				);

			}
		} catch (error) {
			ws.sendError(
				"Wallet check failed! \n	Please make sure that SOLANA_WALLET_PRIVATE_KEY inside file is correct"
			);
			throw error;
		}

		ws.sendInfo("Setting up connection ...");
		console.log("Setting up connection...");
		// connect to RPC
		const connection = new Connection(cache.config.rpc[0]);
		cache.connection = connection;

		ws.sendInfo("Loading Jupiter SDK...");
		console.log("Loading Jupiter SDK...");

		const jupiter = await Jupiter.load({
			connection,
			cluster: cache.config.network,
			user: wallet,
			restrictIntermediateTokens: true,
			wrapUnwrapSOL: cache.wrapUnwrapSOL
		});

		cache.isSetupDone = true;
		ws.sendSuccess("Setup done!");
		console.log("Setup done!");

		return { jupiter };
	} catch (error) {
		ws.sendError(`Setting up failed! ${error}`);
		throw error;
	}
}

export async function getInitialOutAmountWithSlippage(
	jupiter: any,
	inputToken: any,
	outputToken: any,
	amountToTrade: number,
) {
	try {
		ws.sendInfo("Computing routes...");

		// compute routes for the first time
		console.log('Computer first route');
		const routes = await jupiter.computeRoutes({
			inputMint: new PublicKey(inputToken.address),
			outputMint: new PublicKey(outputToken.address),
			forceFetch: true,
			amount: JSBI.BigInt(amountToTrade),
			slippageBps: 0,
			asLegacyTransaction: false
		});

		if (routes?.routesInfos?.length > 0) {
			ws.sendSuccess("Routes computed!");
			console.log('Routes computed!');
		}
		else ws.sendError("No routes found. Something is wrong!");

		return JSBI.toNumber(routes.routesInfos[0].otherAmountThreshold);
	} catch (error) {
		ws.sendError(`Computing routes failed! ${error}`);
		throw error;
	}
}

module.exports = {
	setup,
	getInitialOutAmountWithSlippage
};
