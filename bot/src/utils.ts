import { BotWs } from "./ws";
import fs from "fs";
import ora from "ora-classic";
import chalk from "chalk";
import { Config, cache } from "./cache";

export function  checkRoutesResponse(routes: any, ws: BotWs) {
	if (Object.hasOwn(routes, "routesInfos")) {
		if (routes.routesInfos.length === 0) {
			console.log({
				message: "No routes found or something is wrong with RPC / Jupiter! "
			});
			ws.sendError(
				"No routes found or something is wrong with RPC / Jupiter! "
			);
			throw Error("No routes found or something is wrong with RPC / Jupiter! ");
		}
	} else {
		ws.sendError("No routes found or something is wrong with RPC / Jupiter! ");
		throw Error("No routes found or something is wrong with RPC / Jupiter! ");
	}
}

/**
 * It loads the config file and returns the config object
 * @returns The config object
 */
export function loadConfigFile({ showSpinner = false }): Config {
	let config: Config;
	let spinner;
	if (showSpinner) {
		spinner = ora({
			text: "Loading config...",
			discardStdin: false
		}).start();
	}

	if (fs.existsSync("./data/config.json")) {
		try {
			config = JSON.parse(fs.readFileSync("./data/config.json").toString());
			spinner?.succeed("Config loaded!");
			return config;
		} catch (e) {
			console.log(e);
		}
	}

	spinner?.fail(chalk.redBright("Loading config failed!\n"));
	throw new Error("\nNo config.json file found!\n");
}

export function saveConfigFile() {
	fs.writeFileSync(`./data/config.json`, JSON.stringify(cache.config, null, 2));
}

export function storeItInTempAsJSON(filename: string, data: any) {
	fs.writeFileSync(`./temp/${filename}.json`, JSON.stringify(data, null, 2));
}

export function calculateProfit(oldVal: number, newVal: number): number {
	return ((newVal - oldVal) / oldVal) * 100;
}

export function toDecimal(number: number, decimals: number): string {
	return (number / 10 ** decimals).toFixed(decimals);
}

export function toNumber(number: number, decimals: number): number {
	return number * 10 ** decimals;
}

/**
 * It calculates the number of iterations per minute and updates the cache.
 */
export function updateIterationsPerMin(cache: any) {
	const iterationTimer =
		(performance.now() - cache.iterationPerMinute.start) / 1000;

	if (iterationTimer >= 60) {
		cache.iterationPerMinute.value = Number(
			cache.iterationPerMinute.counter.toFixed()
		);
		cache.iterationPerMinute.start = performance.now();
		cache.iterationPerMinute.counter = 0;
	} else cache.iterationPerMinute.counter++;
}
