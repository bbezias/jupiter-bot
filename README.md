---
# Arb Jupiter Bot

This bot is an open-source CLI tool that allows you to automate your crypto trading strategies on the Solana blockchain. The bot is currently written in JS and uses the [Jupiter SDK](https://docs.jup.ag/jupiter-core/jupiter-sdk/v1) to find routes and execute trades. It is my own version of the jupiter arb bot

## nav

### [features](#features) · [CLI UI](#cli-ui) · ⚡️[install](#install) · [quickstart](#quickstart) · [tips](#some-tips-👀) · [hotkeys](#hotkeys)

---

## features

- [x] mainnet / devnet network support
- [x] all **Jupiter Aggregator** coins
- [x] easy to use **Config Wizard**
- [x] CLI UI
- **Trading strategies**
  - [x] Arbitrage strategy
  - [x] PingPong strategy
  - [ ] limit swap\*
- **Slippage management**
  - [x] `ProfitOrKill`
  - [x] percentage % slippage
- **Profit management**
  - [x] min profit % _(target)_
- **Charts**
  - [x] latency chart
  - [x] simulated profit chart
- **History & Statistics**
  - [x] history of trades (CLI table)
  - [x] statistics of all trades
  - [ ] export to CSV\*

\* not yet implemented / may never be implemented


# install

> Please don't use `npm`, use `yarn` instead.

```bash
$ git clone https://github.com/arbprotocol/solana-jupiter-bot && cd solana-jupiter-bot
$ yarn
```

Set your wallet private key in the `.env` file

```js
SOLANA_WALLET_PRIVATE_KEY =
	hgq847chjjjJUPITERiiiISaaaAWESOMEaaANDiiiIwwWANNAbbbBErrrRICHh;
```

Set the default RPC
**_ARB Protocol RPC is used by default_**

```js
SOLANA_WALLET_PRIVATE_KEY=hgq847chjjjJUPITERiiiISaaaAWESOMEaaANDiiiIwwWANNAbbbBErrrRICHh
DEFAULT_RPC=https://my-super-lazy-rpc.gov
```

· [back to top](#nav) ·

# quickstart

1. Clone this repo
2. Install dependencies
3. Set your wallet private key in the `.env` file
4. Run `yarn start` to start the Config Wizard
5. Follow the steps in the Config Wizard

```
  Usage:
    $ yarn start
      This will open Config Wizard and start the bot

    $ yarn trade
      Start Bot and Trade with latest config

    $ yarn wizard
      Start Config Wizard only
```

· [back to top](#nav) ·

