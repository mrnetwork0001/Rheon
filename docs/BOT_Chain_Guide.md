# Quick Guide

If you are a developer looking to build applications on the BOT Chain, this document provides all the essential information you need.

## Getting Started
BOT Chain is a high-performance blockchain network.

Since BOT Chain is EVM-compatible, your existing Ethereum smart contract skills will seamlessly transfer to BOT Chain.

## Connecting
Here are some resources to help you get connected to the BOT network:

### Wallet Configuration

**Test net**
- Chain ID: 968
- RPC: https://rpc.bohr.life
- Native Token: BOT
- Total Supply: 150 Million
- Explorer: https://scan.bohr.life/

**Main net**
- Chain ID: 677
- RPC: https://rpc.botchain.ai
- Native Token: BOT
- Total Supply: 150 Million
- Explorer: https://scan.botchain.ai

## Get Tokens
BOT is the native utility token of BOT Chain and is used to pay transaction fees. For the testnet, you can obtain test tokens from the BOT Chain faucet.

**BOT Chain Testnet Faucet**
For the mainnet, BOT tokens are currently available exclusively via our official DEX, where you can swap for BOT using supported assets.

**B DEX**

## JSON-RPC API
Interacting with BOT Chain requires sending requests to specific JSON-RPC API methods. BOT Chain's APIs are compatible with Geth.

### Developer Tools
**Explorer**
- BOTScan (Testnet)
- BOTScan (Mainnet)

**SDK.** If you are only using the SDK for Ethereum-compatible functions, then all Ethereum SDKs should work with BOT Chain.
- ethers.js
- web3.js

**Tools**
- Remix
- Hardhat
- Foundry

**Indexing**
- TheGraph
- Covalent
- Others

**Wallets**
- BO Wallet
- Metamask

## JSON-RPC-Endpoint
JSON-RPC endpoints refers to the network location where a program could transfer its RPC requests to access server data. Once you connect a decentralized application to an RPC endpoint, you can access the functionalities of different operations, which could enable real-time usage of blockchain data. BOT Chain provides several RPC endpoints for connecting into both its Mainnet and Testnet. In this section, we list the JSON-RPC endpoints that can be used for connecting to BOT Chain.

### One-click adding BOT network
Visit the ChainList and connect to your wallet. It will add alive RPC endpoints.

### RPC Endpoints for BOT Chain
`eth_getLogs` is disabled on below Mainnet endpoints. Please use 3(rd) party endpoints from here. If you need to pull logs frequently, we recommend using WebSockets to push new logs to you when they are available.

- **BOT Mainnet (ChainID 677)**: https://rpc.botchain.ai
- **BOT Chain Testnet (ChainID 968)**: https://rpc.bohr.life

### Starting HTTP JSON-RPC
You can start the HTTP JSON-RPC with the --http flag
- **mainnet**: https://rpc.botchain.ai
- **testnet**: https://rpc.bohr.life

## JSON-RPC API List
BOT Chain is EVM-compatible and strives to be as compatible as possible with the Go-Ethereum API. However, BOT Chain also has unique features, such as faster finality and the storage of blob data on the execution layer, which require their own specialized APIs.

### Geth(Go-Ethereum) API
BOT Chain is nearly fully compatible with the Geth APIs. Any exceptions or incompatibilities are explicitly listed. If you're looking for detailed usage of a specific API, you will most likely find the answer in the following link:
Geth JSON-RPC API documentation.

### Finality
Ethereum's PoS consensus protocol, known as "Gasper," is built on LMD-GHOST (a fork choice rule) and Casper FFG (a finality gadget). Similarly, BOT Chain's consensus protocol, called "Parlia," is constructed on top of a difficulty-based fork choice mechanism with FFG, as described in BEP-126. To further enhance BOT Chain's throughput, validators are allowed to produce multiple consecutive blocks, as explained in BEP-341. These differences result in BOT Chain having a unique finality process compared to Ethereum.

### Blob
BOT Chain implements EIP-4844, which supports Shard Blob Transactions. For more details, please refer to the Blob API documentation.

### Other BOT Chain API
BOT Chain implements some other APIs

## Claim test tBOT Tokens
**Claim tBOT from Online Faucet**
To get some tBOT of BOT Chain testnet for testing purposes, you can contact us to obtain your tokens.
- Copy your wallet address and paste the address into the textbox
- Select the tokens you need to claim. Major pegged tokens like TUSDT, TUSDC, and others are supported.
*Please note if your wallet balance is larger than 1 tBOT, you can not get new tBOT from the Discord bot faucet.*
