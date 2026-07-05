# 🌊 BotFlow

[![Watch Demo Video](https://img.shields.io/badge/Watch-Demo_Video-blue?style=for-the-badge)](https://youtu.be/your-video-link-here)


**BotFlow** is a premium, AI-shielded micropayment and subscription streaming protocol built to leverage **BOT Chain's** sub-second Layer 1 block times (~0.75s) and near-zero transaction fees. 

It enables users to stream tokens (e.g., $USDT) continuously to AI agents, gaming platforms, and content providers on a strict pay-per-use basis. To guarantee safety and uptime for both parties, a native **AI Sentry Node** monitors service delivery in real time and automatically pauses or adjusts the stream on-chain if a dispute or service outage is detected. 

Additionally, the MVP includes a built-in **BDEX Portal** interface allowing users to swap between native gas `$BOT` and stream `$USDT` instantly.

---

## 🌟 Key Features

1. **Sub-second Payment Streaming**: Accrue token balances per-second using pro-rata calculation. Receivers can claim accrued tokens in real time.
2. **AI Sentry Node Override**: An off-chain monitoring agent health-checks the AI/content provider and fires auto-pause signals on-chain if failures occur.
3. **BDEX Portal Integration**: Swap gas assets and streaming tokens on-the-fly with sub-second finality.
4. **Interactive Sandbox Mode**: Full client-side simulation fallback if MetaMask or deployed contracts are not present, enabling judges to verify the product flow end-to-end immediately.

---

## 📁 Repository Structure

```
BOTflow/
├── contracts/          # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── BotFlowStreamer.sol  # Core payment streaming protocol
│   │   ├── MockUSDT.sol          # Faucet-enabled Mock USDT token
│   │   └── MockBDEX.sol          # Swap router contract
│   ├── test/            # Unit tests (math, pauses, cancellations)
│   └── scripts/         # Deploy scripts pre-configured for BOT Chain
├── sentry/             # TypeScript AI Sentry Node monitor service
│   └── src/
│       └── monitor.ts   # Core health checker loop and Control Server
└── frontend/           # Breathtaking React + Vite web dashboard
    ├── src/
    │   ├── styles/      # Glassmorphism, animations, and custom CSS
    │   └── App.jsx      # Live tickers, swap portal, and sentry dashboard
```

---

## ⚙️ BOT Chain Network Config

Add the network manually to your wallet (MetaMask, Rabby, etc.) using these parameters:
- **Network Name**: BOT Chain
- **RPC URL**: `https://rpc.botchain.ai`
- **Chain ID**: `677`
- **Currency Symbol**: `BOT`
- **Block Explorer**: `https://scan.botchain.ai`

---

## 🚀 Getting Started

### 1. Bootstrap all dependencies
At the root directory, run:
```bash
npm run bootstrap
```
This installs the root and subfolder dependencies (contracts, sentry, and frontend).

### 2. Smart Contract Operations (Hardhat)
In the `contracts/` directory:
- **Compile Contracts**:
  ```bash
  npm run compile
  ```
- **Run Unit Tests**:
  ```bash
  npm run test
  ```
- **Deploy to BOT Chain**:
  Make sure to configure `PRIVATE_KEY` in your `.env` and run:
  ```bash
  npm run deploy
  ```

### 3. Running the AI Sentry Node
To launch the Sentry server that health-checks the provider and manages auto-pauses:
In the `sentry/` directory:
- Make sure to copy `.env.example` to `.env` and fill in:
  - `SENTRY_PRIVATE_KEY` (Sentry hot wallet)
  - `STREAMER_CONTRACT_ADDRESS` (Deployed streamer address)
- Run the monitor:
  ```bash
  npm start
  ```
The Sentry dashboard api will run at `http://localhost:4000`.

### 4. Running the Frontend App
To spin up the beautiful React developer dashboard:
In the `frontend/` directory:
- Configure contract addresses in `.env` if deployed on BOT Chain.
- Run the local dev server:
  ```bash
  npm run dev
  ```
Open `http://localhost:3000` in your browser.

---

## 🤖 AI Sentry Integration Details
In the dashboard:
- Create a stream, choose the flow rate, and specify your **Sentry Node Address**.
- Watch the **Live Flow Ticker** count up by milliseconds.
- The off-chain **AI Sentry Node** continually polls your configured `TARGET_API_HEALTH_URL` (e.g. OpenAI's status page).
- If the provider suffers an outage or the ping times out, the Sentry Node detects the failure instantly, signs a pause transaction, and submits it to BOT Chain. Within **~0.75 seconds**, the stream is automatically paused on-chain, halting token transfers immediately and protecting the user's funds.
