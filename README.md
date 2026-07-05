# 🌊 Rheon: AI-Shielded Continuous Payment Streaming

[![Watch Demo Video](https://img.shields.io/badge/Watch-Demo_Video-blue?style=for-the-badge)](https://youtu.be/your-video-link-here)
[![Built on BOT Chain](https://img.shields.io/badge/Built_on-BOT_Chain-4A90E2?style=for-the-badge)](https://botchain.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Rheon** is a premium, decentralized micropayment and subscription streaming protocol. Built natively for **BOT Chain**, it leverages sub-second Layer 1 block times (~0.75s) and near-zero transaction fees to enable true real-time pay-as-you-go economies.

---

## 🛑 The Problem
The current subscription economy is broken, especially for high-frequency micro-transactions like AI API consumption, cloud computing, and real-time gaming:
1. **Capital Inefficiency:** Users are forced into rigid monthly subscriptions, paying for idle time.
2. **Trust Deficit:** Pre-paying for AI API credits puts the user at risk if the service goes down.
3. **Dispute Friction:** Web2 chargebacks take weeks. Web3 lacks native, automated consumer protection for streamed payments.

## 💡 The Rheon Solution
Rheon introduces **Trustless Continuous Micro-Streaming**. You don't pay upfront; you stream tokens (like `$USDT`) to the provider *by the second*. 

To guarantee safety, Rheon introduces the **AI Sentry Node**—an off-chain watchdog that constantly monitors the provider's API health. If the AI service drops, the Sentry Node automatically pauses the payment stream on-chain in under 1 second, protecting the user's funds.

---

## 🌟 Core Features

- ⚡ **Sub-second Payment Streaming:** Accrue token balances per-second using advanced pro-rata smart contract calculations. Receivers can withdraw their accrued yield instantly, at any time.
- 🛡️ **AI Sentry Node Override:** A dedicated off-chain monitoring agent constantly health-checks the AI/content provider. If an outage is detected, it fires an auto-pause transaction to the smart contract, halting funds instantly.
- ⚖️ **DAO Dispute Resolution:** If a user manually disputes a stream, funds are frozen. The Rheon DAO can review the Sentry Node's uptime logs and vote to either refund the user or resume the stream.
- 💱 **Built-in BDEX Portal:** Users can swap seamlessly between the native gas token (`$BOT`) and streaming tokens (`$USDT`) directly in the dashboard via our automated market maker integration.
- 🎨 **Premium UX/UI:** A breathtaking, glassmorphic React dashboard providing real-time visual feedback of funds flowing down to the micro-cent.

---

## 🏗️ Architecture & Tech Stack

Rheon is a full-stack Web3 application divided into three core pillars:

1. **Smart Contracts (`/contracts`)**: 
   - Written in **Solidity** (Hardhat).
   - Deployed on **BOT Chain Testnet**.
   - Handles stream creation, real-time balance calculation, pausing, Sentry authorization, and the BDEX routing.
2. **AI Sentry Node (`/sentry`)**: 
   - Written in **TypeScript** / Node.js.
   - Operates as a decentralized bot using `ethers.js` to listen for on-chain events and execute high-speed intervention transactions.
3. **Frontend Dashboard (`/frontend`)**: 
   - Built with **React** + **Vite**.
   - Integrates `ethers.js` for Web3 connectivity and real-time DOM updates to animate the flow of money.

### 📁 Repository Structure
```text
Rheon/
├── contracts/               # Solidity smart contracts
│   ├── contracts/
│   │   ├── BotFlowStreamer.sol  # Core protocol logic
│   │   ├── MockUSDT.sol         # Streamable token
│   │   └── MockBDEX.sol         # Swap router
│   ├── test/                # Comprehensive test suite
│   └── scripts/             # Deployment scripts
├── sentry/                  # Off-chain AI Sentry Node
│   └── src/
│       └── monitor.ts       # Health checking & transaction signing logic
└── frontend/                # React Web Dashboard
    ├── src/
    │   ├── styles/          # Custom CSS & Glassmorphism
    │   └── App.jsx          # Main application logic
    └── .env.example         # Required environment variables
```

---

## 🚀 Quickstart Guide for Judges

### 1. Network Configuration
Add BOT Chain Testnet to your Web3 Wallet (MetaMask, Rabby):
- **Network Name**: BOT Chain
- **RPC URL**: `https://rpc.botchain.ai`
- **Chain ID**: `677`
- **Currency Symbol**: `BOT`
- **Explorer**: `https://scan.botchain.ai`

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/mrnetwork0001/BOTflow.git
cd BOTflow
npm run bootstrap
```

### 3. Smart Contracts (Optional: If you want to redeploy)
```bash
cd contracts
npm run compile
npm run deploy # Requires PRIVATE_KEY in .env
```

### 4. Start the AI Sentry Node
The Sentry Node acts as the automated referee.
```bash
cd sentry
cp .env.example .env
# Ensure SENTRY_PRIVATE_KEY and TARGET_API_HEALTH_URL are set
npm start
```

### 5. Launch the Frontend
```bash
cd frontend
cp .env.example .env
# Fill in contract addresses if you deployed fresh, otherwise use defaults
npm run dev
```
Open `http://localhost:3000` (or the port specified by Vite) in your browser.

---

## 🤖 AI Sentry Integration Details
In the dashboard:
- Create a stream, choose the flow rate, and specify your **Sentry Node Address**.
- Watch the **Live Flow Ticker** count up by milliseconds.
- The off-chain **AI Sentry Node** continually polls your configured `TARGET_API_HEALTH_URL` (e.g. OpenAI's status page).
- If the provider suffers an outage or the ping times out, the Sentry Node detects the failure instantly, signs a pause transaction, and submits it to BOT Chain. Within **~0.75 seconds**, the stream is automatically paused on-chain, halting token transfers immediately and protecting the user's funds.

---

## 🎯 Use Cases

- **AI API Gateways:** Stream payments per LLM token generated instead of buying rigid credit packs.
- **Cloud Infrastructure:** Pay for AWS/GCP server uptime by the second; stop paying the millisecond the server goes down.
- **Freelance Escrow:** Stream a salary to a contractor block-by-block. Pause immediately if work stops.
- **Web3 Gaming:** Stream tokens to play premium game instances, automatically terminating access when the stream stops.

---

## 🛣️ Future Roadmap

- **Multi-Chain Expansion:** Deploying cross-chain Sentry nodes to manage streams across Ethereum, Base, and Arbitrum.
- **Decentralized Sentry Network:** Transitioning from a single Sentry Node to a decentralized oracle network (DON) for trustless consensus on API uptime.
- **Dynamic Rate Adjustments:** Allowing the Sentry node to automatically throttle the payment rate based on API latency (e.g., paying less if the AI response is slow).

---
*Built with ❤️ for the BOT Chain Ecosystem.*
