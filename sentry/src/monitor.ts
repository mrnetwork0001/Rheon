import { ethers } from "ethers";
import * as http from "http";
import * as url from "url";
import * as dotenv from "dotenv";

dotenv.config();

// BOT Chain Network configuration (EVM L1)
const RPC_URL = process.env.BOTCHAIN_RPC_URL || "https://rpc.botchain.ai";
const STREAMER_CONTRACT_ADDRESS = process.env.STREAMER_CONTRACT_ADDRESS || "";
const SENTRY_PRIVATE_KEY = process.env.SENTRY_PRIVATE_KEY || ""; // Private key of the sentry node hot wallet
const PORT = process.env.SENTRY_PORT ? parseInt(process.env.SENTRY_PORT) : 4000;

// Minimal ABI of BotFlowStreamer
const STREAMER_ABI = [
  "event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed receiver, address token, uint256 deposit, uint256 ratePerSecond, uint256 startTime, uint256 stopTime, address sentryNode)",
  "event StreamPaused(uint256 indexed streamId, address indexed by)",
  "event StreamResumed(uint256 indexed streamId, address indexed by, uint256 newStopTime)",
  "event StreamCancelled(uint256 indexed streamId, uint256 receiverAmount, uint256 senderAmount)",
  "function pauseStream(uint256 streamId) external",
  "function resumeStream(uint256 streamId) external",
  "function adjustStreamRate(uint256 streamId, uint256 newRatePerSecond) external",
  "function streams(uint256 streamId) external view returns (address sender, address receiver, address token, uint256 deposit, uint256 ratePerSecond, uint256 startTime, uint256 stopTime, uint256 remainingBalance, uint256 accruedUntilLastUpdate, uint256 withdrawnAmount, uint256 lastUpdateTime, address sentryNode, bool isPaused, bool isActive)",
  "function getAccrued(uint256 streamId) public view returns (uint256)"
];

// Memory registries for demo purposes
interface LogEntry {
  timestamp: string;
  type: "INFO" | "WARNING" | "ERROR" | "ACTION";
  message: string;
}

const logs: LogEntry[] = [];
let simulatedProviderStatus: "HEALTHY" | "OUTAGE" | "DISPUTE" = "HEALTHY";
const activeMonitoredStreams = new Set<number>();

function addLog(type: LogEntry["type"], message: string) {
  const log: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    message
  };
  logs.push(log);
  console.log(`[${log.timestamp}] [${type}] ${message}`);
  // Keep logs list bounded
  if (logs.length > 100) logs.shift();
}

async function startSentryNode() {
  addLog("INFO", "Starting BotFlow AI Sentry Node...");
  addLog("INFO", `Connecting to BOT Chain RPC: ${RPC_URL}`);

  let provider: ethers.JsonRpcProvider;
  let wallet: ethers.Wallet | null = null;
  let contract: ethers.Contract | null = null;

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    if (SENTRY_PRIVATE_KEY) {
      wallet = new ethers.Wallet(SENTRY_PRIVATE_KEY, provider);
      addLog("INFO", `Sentry Wallet Loaded: ${wallet.address}`);
      if (STREAMER_CONTRACT_ADDRESS) {
        contract = new ethers.Contract(STREAMER_CONTRACT_ADDRESS, STREAMER_ABI, wallet);
        addLog("INFO", `Watching BotFlowStreamer at: ${STREAMER_CONTRACT_ADDRESS}`);
      } else {
        addLog("WARNING", "STREAMER_CONTRACT_ADDRESS not configured. Running in dry-run monitoring mode.");
      }
    } else {
      addLog("WARNING", "SENTRY_PRIVATE_KEY not configured. Running in read-only monitoring mode.");
    }
  } catch (error: any) {
    addLog("ERROR", `Failed to initialize ethers provider/wallet: ${error.message}`);
    return;
  }

  // Sentry Monitoring Loop (Periodically check provider health and intervene)
  setInterval(async () => {
    if (activeMonitoredStreams.size === 0) {
      return; // Nothing to check
    }

    addLog("INFO", `Active streams to monitor: ${Array.from(activeMonitoredStreams).join(", ")}. Status: ${simulatedProviderStatus}`);

    if (simulatedProviderStatus !== "HEALTHY") {
      // Outage or dispute detected! AI Sentry intervenes
      for (const streamId of activeMonitoredStreams) {
        try {
          addLog("WARNING", `Outage/Dispute detected for stream ${streamId}! Initiating AI Sentry on-chain intervention...`);

          if (contract && wallet) {
            // Check if already paused first to avoid redundant transactions
            const streamData = await contract.streams(streamId);
            const isPaused = streamData.isPaused;
            const isActive = streamData.isActive;

            if (!isActive) {
              activeMonitoredStreams.delete(streamId);
              addLog("INFO", `Stream ${streamId} is no longer active. Removed from monitoring.`);
              continue;
            }

            if (!isPaused) {
              addLog("ACTION", `Sending pause transaction for stream ${streamId} to BOT Chain...`);
              
              // Send transaction with gas optimal parameters for BOT Chain
              const tx = await contract.pauseStream(streamId);
              addLog("INFO", `Intervention transaction submitted. Tx Hash: ${tx.hash}`);
              
              // Wait for sub-second confirmation on BOT Chain
              const receipt = await tx.wait();
              addLog("ACTION", `Intervention confirmed in block ${receipt.blockNumber}! Stream ${streamId} paused successfully.`);
            } else {
              addLog("INFO", `Stream ${streamId} is already paused. Monitoring continues.`);
            }
          } else {
            addLog("ACTION", `[DRY-RUN] Would have paused stream ${streamId} on-chain.`);
          }
        } catch (error: any) {
          addLog("ERROR", `Intervention failed for stream ${streamId}: ${error.message}`);
        }
      }
    }
  }, 4000); // Check every 4 seconds

  // Listen to contract events if available
  if (contract) {
    try {
      contract.on("StreamCreated", (streamId, sender, receiver, token, deposit, ratePerSecond, startTime, stopTime, sentryNode) => {
        // If this stream uses our sentry, add to monitored list
        if (wallet && sentryNode.toLowerCase() === wallet.address.toLowerCase()) {
          const id = Number(streamId);
          activeMonitoredStreams.add(id);
          addLog("INFO", `On-chain Event: StreamCreated. Added stream ${id} (Receiver: ${receiver}) to active Sentry monitoring list.`);
        }
      });

      contract.on("StreamPaused", (streamId, by) => {
        addLog("INFO", `On-chain Event: Stream ${streamId} paused by ${by}.`);
      });

      contract.on("StreamResumed", (streamId, by, newStopTime) => {
        addLog("INFO", `On-chain Event: Stream ${streamId} resumed by ${by}.`);
      });

      contract.on("StreamCancelled", (streamId, receiverAmount, senderAmount) => {
        const id = Number(streamId);
        activeMonitoredStreams.delete(id);
        addLog("INFO", `On-chain Event: Stream ${id} cancelled. Removed from Sentry monitoring.`);
      });
    } catch (err: any) {
      addLog("ERROR", `Failed to set up on-chain event listeners: ${err.message}`);
    }
  }

  // Create local HTTP Control Server for UI feedback and simulation
  const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname;

    if (pathname === "/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          providerStatus: simulatedProviderStatus,
          monitoredStreams: Array.from(activeMonitoredStreams),
          sentryAddress: wallet ? wallet.address : "0x0000000000000000000000000000000000000000",
          contractAddress: STREAMER_CONTRACT_ADDRESS
        })
      );
    } else if (pathname === "/logs" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(logs));
    } else if (pathname === "/simulate-outage" && req.method === "POST") {
      simulatedProviderStatus = "OUTAGE";
      addLog("WARNING", "Simulation Triggered: Provider Outage started.");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", providerStatus: simulatedProviderStatus }));
    } else if (pathname === "/simulate-dispute" && req.method === "POST") {
      simulatedProviderStatus = "DISPUTE";
      addLog("WARNING", "Simulation Triggered: User Dispute started.");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", providerStatus: simulatedProviderStatus }));
    } else if (pathname === "/simulate-healthy" && req.method === "POST") {
      simulatedProviderStatus = "HEALTHY";
      addLog("INFO", "Simulation Triggered: Provider Restored (Healthy).");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", providerStatus: simulatedProviderStatus }));
    } else if (pathname === "/register" && req.method === "POST") {
      // Manual registration for off-chain or testing streams
      let body = "";
      req.on("data", chunk => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (data.streamId) {
            activeMonitoredStreams.add(Number(data.streamId));
            addLog("INFO", `Manually registered stream ${data.streamId} to monitoring list.`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "success", monitoredStreams: Array.from(activeMonitoredStreams) }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing streamId" }));
          }
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(PORT, () => {
    addLog("INFO", `Sentry Control Server running on port ${PORT}`);
    addLog("INFO", `Logs available at http://localhost:${PORT}/logs`);
    addLog("INFO", `Status available at http://localhost:${PORT}/status`);
  });
}

startSentryNode().catch(err => {
  console.error("Fatal error starting Sentry Node:", err);
});
