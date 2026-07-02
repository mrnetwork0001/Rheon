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

---

# BOT Chain Project Integration Guide
Welcome to BOT Chain

BOT Chain is a high-performance and EVM- compatible Layer 1 blockchain specifically designed for AI Agents, DePIN, verifiable computing, and the protocol economy. 
This guide provides project teams with complete, step-by-step instructions to integrate and launch on BOT Chain Mainnet quickly, securely, and efficiently.

## Official Links

| Resource | Link |
| --- | --- |
| Website | https://www.botchain.ai |
| Testnet Faucet (Get test BOT) | https://faucet.botchain.ai |
| DEX | https://dex.botchain.ai/#/swap <br> https://dev-docs.botchain.ai/docs/DEX/ |
| Cross-Chain Bridge | https://bridge.botchain.ai |
| Official Wallet | https://wallet.botchain.ai |
| Block Explorer | https://scan.botchain.ai |
| Developer Documentation | https://dev-docs.botchain.ai/docs/Developers/quick-guide/ |
| GitHub | https://github.com/BOTChain-bot |
| BOT Price API | https://dex-wallet.botchain.ai/api/graph/price?token=0xD5452816194a3784dBa983426cCe7c122F4abd30 |
| WBOT contract | `0xD5452816194a3784dBa983426cCe7c122F4abd30` |
| USDT contract on BOT Chain | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` |
| BOT Chain Brand Kit | https://drive.google.com/drive/folders/1AYVj_gvnffA4T-QyXN3opgWNG5M7oD_1 |


## Add BOT Chain to Your Wallet

### Supporting EVM Wallets

**Wallets Integration**
- Bitget Wallet https://web3.bitget.com/
- TokenPocket https://www.tokenpocket.pro
- OKX Wallet
- MetaMask 

**Add BOT Chain through Chainlist**
Visit https://chainlist.org/?search=bot+chain&testnets=true 
Connect Wallet
Add BOT Chain to your wallet

**Add BOT Chain Manually**
Open your wallet
Select Network, Add Custom Network
Fill in the following Mainnet information:

| Item | Parameter |
| --- | --- |
| Network Name | BOT Chain |
| Default RPC URL | https://rpc.botchain.ai |
| Chain ID | 677 |
| Currency symbol/Native Token | BOT |
| Block Explorer URL | https://scan.botchain.ai/ |


## Project Integration Steps
- **Step 1:** Add BOT Chain Mainnet to your wallet (see instructions above)
- **Step 2:** Obtain test tokens from the faucet for testing
- **Step 3:** Deploy your smart contracts using Hardhat / Foundry / Remix via the official RPC
- **Step 4:** Verify your contracts on the block explorer and test your product

## Security & Audit Reports
All core contracts of BOT Chain have been professionally audited by CertiK:
- BOT Chain Audit Report: https://www.botchain.ai/docs/Chain.pdf 
- BOT DEX Audit Report: https://dex.botchain.ai/docs/Dex-Audit-Report.pdf
- BOT Bridge Audit Report: https://bridge.botchain.ai/docs/Bridge-Audit-Report.pdf
- CertiK Skynet Project Insight: https://skynet.certik.com/projects/botchain 

Welcome to build the future of an intelligent economy together on BOT Chain!
If you need any assistance during integration, please feel free to contact the BOT Chain team.


## Other Information

**CA token on mainnet:**
https://scan.botchain.ai/token/0x546307af427902A75771434Df831d88219784E19 

**WSS endpoint:**
- wss://ws-rpc.botchain.ai  
- wss://ws-rpc-debug.botchain.ai/ 

**Contract addresses on BDEX:**
```json
"mainnet": {
    "chainId": 677,
    "deployer": "0xf0A2f56505f0dfea980567DA88830146B6b5c0b2",
    "tokens": {
      "wbot": "0xD5452816194a3784dBa983426cCe7c122F4abd30",
      "usdt": "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"
    },
    "v3": {
      "deployedAt": "2026-02-26T05:57:53.573Z",
      "factory": "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
      "swapRouter": "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
      "quoter": "0x1e8bb093ade678ABAa49623D4c3a1a7F37716DEd",
      "quoterV2": "0x034A705b36067cff99ABf5C662Be881cBd8d0176",
      "botdexMulticall": "0x5FC578616301E56137dc3872593d496668525362",
      "nftDescriptor": "0x829D215662e89881adE3C7b15a0af812c4364dA4",
      "nftPositionDescriptor": "0x89b084964AF60BeE7bEc324Ea62267C97f6656E3",
      "nftPositionManager": "0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090"
    }
  }
```

---

# Introduction to DEX on BOT Chain
BOT Chain is a high-performance EVM-compatible Layer 1 blockchain featuring 0.75-second block times, Physical Finality, and extremely low gas fees — making it an ideal platform for building fast and efficient Decentralized Exchanges (DEXs).

## Why Build a DEX on BOT Chain?
- Ultra-low gas fees — Significantly reduce costs for swaps and liquidity provision
- Fast Finality — Minimize Impermanent Loss risk for liquidity providers
- MEV Resistance — Create a fairer trading environment
- Full EVM Compatibility — Easily fork Uniswap V2, PancakeSwap, or Uniswap V3

## Contract Addresses
All BDEX smart contracts are deployed on BOT Chain Mainnet (Chain ID: 677) and Testnet (Chain ID: 968).

### BDEX V2 — Mainnet
| Contract | Address | Description |
| --- | --- | --- |
| V2 Factory | 0x117115f3B72C8d1989178089A67D0C26f8EE0AA3 | Creates and manages all V2 trading pairs |
| V2 Router02 | 0x1414eD29FdFD322c3c0a830330ed982E2D629e76 | Routes swaps and manages liquidity operations |
| WBOT | 0xD5452816194a3784dBa983426cCe7c122F4abd30 | Wrapped BOT |
| Multicall3 | 0x47FA21f684bBAD707A53a0f9BE59F1422F46C265 | Batch contract calls |

### BDEX V3 — Mainnet
| Contract | Address | Description |
| --- | --- | --- |
| V3 Factory | 0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419 | Creates and manages all V3 pools |
| SwapRouter | 0x07032d47A1b9f8460cBeE9dC17c1d3E438693929 | Executes V3 swaps |
| SwapRouter02 | 0xaE6ae8630f7A888dEc0B9195C85F7515d5887655 | Unified router supporting both V2 & V3 |
| QuoterV2 | 0x034A705b36067cff99ABf5C662Be881cBd8d0176 | Off-chain quote simulation |
| NonfungiblePositionManager | 0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090 | Manages LP positions as NFTs |

### BDEX V2 — Testnet
| Contract | Address |
| --- | --- |
| V2 Factory | 0x65b8e98ceA190d8c28B3e4716402027f634d15a3 |
| V2 Router02 | 0xD6425a02f0845B8D99e349C34D2E7A576E177345 |
| WBOT | 0xD5452816194a3784dBa983426cCe7c122F4abd30 |

### BDEX V3 — Testnet
| Contract | Address |
| --- | --- |
| V3 Factory | 0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419 |
| SwapRouter | 0x07032d47A1b9f8460cBeE9dC17c1d3E438693929 |
| QuoterV2 | 0x034A705b36067cff99ABf5C662Be881cBd8d0176 |
| NonfungiblePositionManager | 0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090 |

### Common Tokens (Mainnet)
| Token | Symbol | Decimals | Address |
| --- | --- | --- | --- |
| Wrapped BOT | WBOT | 18 | 0xD5452816194a3784dBa983426cCe7c122F4abd30 |
| Tether USD | USDT | 6 | 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C |

## Core Concepts
### AMM (Automated Market Maker)
BDEX uses the AMM model to enable permissionless token trading without order books.

| Model | Protocol | Formula | Use Case |
| --- | --- | --- | --- |
| Constant Product | BDEX V2 | x × y = k | Simple, universal, lower gas cost |
| Concentrated Liquidity | BDEX V3 | Liquidity within price ranges | Capital efficient, advanced LP strategies |

## BDEX V2
BDEX V2 is a Constant Product AMM (x × y = k) deployed on BOT Chain, based on the battle-tested Uniswap V2 architecture.

**Token Swap Guide:**
Recommended integration path:
1. Call the Routing API `GET /quote`.
2. Read `methodParameters.to`, `methodParameters.calldata`, and `methodParameters.value` from the response.
3. Submit these fields with `eth_sendTransaction`.

Direct Router02 methods:
```solidity
function swapExactTokensForTokens(
  uint amountIn,
  uint amountOutMin,
  address[] calldata path,
  address to,
  uint deadline
) external returns (uint[] memory amounts);
```

## BDEX V3
BDEX V3 introduces Concentrated Liquidity, allowing LPs to allocate capital within custom price ranges for significantly improved capital efficiency. Based on the Uniswap V3 architecture.

## API Reference
BOT Chain DEX provides official APIs for developers.
View API Documentation:
- Testnet: https://s.apifox.cn/78c89a55-76be-4d27-9efe-35626bd465f2
- Mainnet: https://s.apifox.cn/139b78fd-a57f-470a-ac74-b7246d32f2e6
