import chalk from "chalk";
import fs from "fs";
import ora from "ora-classic";

const createTempDir = () =>
	!fs.existsSync("../temp") && fs.mkdirSync("../temp");

const createConfigFile = (config) => {
	const configSpinner = ora({
		text: "Creating config...",
		discardStdin: false,
	}).start();

	const configValues = {
		network: config.network.value,
		rpc: config.rpc.value,
		tradingStrategy: config.strategy.value,
		tokenA: config.tokens.value.tokenA,
		tokenB: config.tokens.value.tokenB,
		slippage: config.slippage.value,
		minPercProfit: config.profit.value,
		minInterval: parseInt(config.advanced.value.minInterval),
		strategyName: config.strategyName.value,
		tradeSize: {
			value: parseFloat(config["trading size"].value.value),
			strategy: config["trading size"].value.strategy,
		},
		ui: {
			defaultColor: "cyan",
		},
		storeFailedTxInHistory: true,
	};

	fs.writeFileSync(`./data/config.json`, JSON.stringify(configValues, null, 2), {});
	configSpinner.succeed("Config created!");
};

const verifyConfig = (config) => {
	let result = true;
	const badConfig = [];
	Object.entries(config).forEach(([key, value]) => {
		const isSet = value.isSet;
		const isSectionSet =
			isSet instanceof Object
				? Object.values(isSet).every((value) => value === true)
				: isSet;

		if (!isSectionSet) {
			result = false;
			badConfig.push(key);
		}
	});
	return { result, badConfig };
};

const checkForEnvFile = () => {
	if (!fs.existsSync("../.env")) {
		console.log({
			message: "No .env file found! ",
		});
		process.exit(1);
	}
};

module.exports = {
	createTempDir,
	createConfigFile,
	verifyConfig,
	checkForEnvFile,
};
