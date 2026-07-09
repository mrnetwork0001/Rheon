import { ethers } from "ethers";
import * as http from "http";
import * as url from "url";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// BOTChain Network configuration (EVM L1)
const RPC_URL = process.env.BOTCHAIN_RPC_URL || "https://rpc.botchain.ai";
const STREAMER_CONTRACT_ADDRESS = process.env.STREAMER_CONTRACT_ADDRESS || "";
const SENTRY_PRIVATE_KEY = process.env.SENTRY_PRIVATE_KEY || ""; // Private key of the sentry node hot wallet
const PORT = process.env.SENTRY_PORT ? parseInt(process.env.SENTRY_PORT) : 4000;
const TARGET_API_HEALTH_URL = process.env.TARGET_API_HEALTH_URL || "https://status.openai.com/api/v2/status.json";

// Minimal ABI of BotFlowStreamer
const STREAMER_ABI = [
  "event StreamCreated(uint256 indexed streamId, address indexed sender, address[] receivers, uint256[] sharePercentages, address token, uint256 deposit, uint256 ratePerSecond, uint256 startTime, uint256 stopTime, address sentryNode)",
  "event StreamPaused(uint256 indexed streamId, address indexed by)",
  "event StreamResumed(uint256 indexed streamId, address indexed by, uint256 newStopTime)",
  "event StreamCancelled(uint256 indexed streamId, uint256 receiverAmount, uint256 senderAmount)",
  "function pauseStream(uint256 streamId) external",
  "function resumeStream(uint256 streamId) external",
  "function adjustStreamRate(uint256 streamId, uint256 newRatePerSecond) external",
  "function nextStreamId() view returns (uint256)",
  "function getStream(uint256 streamId) view returns (tuple(address sender, address[] receivers, uint256[] sharePercentages, address token, uint256 deposit, uint256 ratePerSecond, uint256 startTime, uint256 stopTime, uint256 remainingBalance, uint256 accruedUntilLastUpdate, uint256 withdrawnAmount, uint256 lastUpdateTime, address sentryNode, bool isPaused, bool isDisputed, bool isActive))",
  "function getAccrued(uint256 streamId) public view returns (uint256)"
];

// Memory registries for demo purposes
interface LogEntry {
  timestamp: string;
  type: "INFO" | "WARNING" | "ERROR" | "ACTION";
  message: string;
}

const logs: LogEntry[] = [];
let providerStatus: "HEALTHY" | "OUTAGE" | "DISPUTE" = "HEALTHY";
let forceOutageMode = false;
const activeMonitoredStreams = new Set<number>();

// Auto-Resume preferences persistence
const autoResumeSettingsFile = path.join(process.cwd(), "auto_resume_settings.json");
const autoResumeStreams = new Set<number>();

function loadAutoResumeSettings() {
  try {
    if (fs.existsSync(autoResumeSettingsFile)) {
      const data = JSON.parse(fs.readFileSync(autoResumeSettingsFile, "utf8"));
      if (Array.isArray(data)) {
        data.forEach((id: number) => autoResumeStreams.add(id));
        addLog("INFO", `Loaded auto-resume settings for streams: ${data.join(", ")}`);
      }
    }
  } catch (err: any) {
    addLog("WARNING", `Failed to load auto-resume settings: ${err.message}`);
  }
}

function saveAutoResumeSettings() {
  try {
    fs.writeFileSync(autoResumeSettingsFile, JSON.stringify(Array.from(autoResumeStreams)), "utf8");
  } catch (err: any) {
    addLog("WARNING", `Failed to save auto-resume settings: ${err.message}`);
  }
}

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
  addLog("INFO", "Starting Rheon AI Sentry Node...");
  loadAutoResumeSettings();
  addLog("INFO", `Connecting to BOTChain RPC: ${RPC_URL}`);

  let provider: ethers.JsonRpcProvider;
  let wallet: ethers.Wallet | null = null;
  let contract: ethers.Contract | null = null;
  let lastCheckedBlock = 0;

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    if (SENTRY_PRIVATE_KEY) {
      wallet = new ethers.Wallet(SENTRY_PRIVATE_KEY, provider);
      addLog("INFO", `Sentry Wallet Loaded: ${wallet.address}`);
      if (STREAMER_CONTRACT_ADDRESS) {
        contract = new ethers.Contract(STREAMER_CONTRACT_ADDRESS, STREAMER_ABI, wallet);
        addLog("INFO", `Watching BotFlowStreamer at: ${STREAMER_CONTRACT_ADDRESS}`);
        
        try {
          lastCheckedBlock = await provider.getBlockNumber();
          addLog("INFO", `Event log listener initialized starting at block ${lastCheckedBlock}`);
          
          // Historical streams scanner
          try {
            const nextId = await contract.nextStreamId();
            const totalStreams = Number(nextId) - 1;
            addLog("INFO", `Scanning ${totalStreams} historical streams on startup...`);
            for (let i = 1; i <= totalStreams; i++) {
              const streamData = await contract.getStream(i);
              if (streamData.isActive && streamData.sentryNode.toLowerCase() === wallet.address.toLowerCase()) {
                activeMonitoredStreams.add(i);
                addLog("INFO", `Added active stream ${i} from historical scan to Sentry monitoring list.`);
              }
            }
          } catch (scanErr: any) {
            addLog("WARNING", `Error scanning historical streams: ${scanErr.message}`);
          }
        } catch (blockErr: any) {
          addLog("WARNING", `Could not fetch starting block number, defaulting to 0: ${blockErr.message}`);
        }
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

    // Real API Polling
    try {
      if (forceOutageMode) {
        providerStatus = "OUTAGE";
      } else if (TARGET_API_HEALTH_URL) {
        // Ping the health URL. Timeout or non-200 means outage.
        const res = await fetch(TARGET_API_HEALTH_URL, { method: "GET", signal: AbortSignal.timeout(3000) });
        if (res.ok) {
           if (providerStatus !== "HEALTHY") addLog("INFO", "API is back online. Status: HEALTHY");
           providerStatus = "HEALTHY";
        } else {
           if (providerStatus !== "OUTAGE") addLog("WARNING", `API returned ${res.status}. Status: OUTAGE`);
           providerStatus = "OUTAGE";
        }
      }
    } catch (err: any) {
      if (providerStatus !== "OUTAGE") addLog("WARNING", `API fetch failed (${err.message}). Status: OUTAGE`);
      providerStatus = "OUTAGE";
    }

    addLog("INFO", `Active streams to monitor: ${Array.from(activeMonitoredStreams).join(", ")}. Status: ${providerStatus}`);

    if (providerStatus !== "HEALTHY") {
      // Outage or dispute detected! AI Sentry intervenes to pause
      for (const streamId of activeMonitoredStreams) {
        try {
          if (contract && wallet) {
            const streamData = await contract.getStream(streamId);
            const isPaused = streamData.isPaused;
            const isActive = streamData.isActive;

            if (!isActive) {
              activeMonitoredStreams.delete(streamId);
              addLog("INFO", `Stream ${streamId} is no longer active. Removed from monitoring.`);
              continue;
            }

            if (!isPaused) {
              addLog("WARNING", `Outage/Dispute detected for stream ${streamId}! Initiating AI Sentry onchain pause...`);
              addLog("ACTION", `Sending pause transaction for stream ${streamId} to BOTChain...`);
              const tx = await contract.pauseStream(streamId);
              addLog("INFO", `Intervention transaction submitted. Tx Hash: ${tx.hash}`);
              const receipt = await tx.wait();
              addLog("ACTION", `Intervention confirmed in block ${receipt.blockNumber}! Stream ${streamId} paused successfully.`);
            }
          } else {
            addLog("ACTION", `[DRY-RUN] Would have paused stream ${streamId} onchain.`);
          }
        } catch (error: any) {
          addLog("ERROR", `Intervention (Pause) failed for stream ${streamId}: ${error.message}`);
        }
      }
    } else {
      // API is HEALTHY! Auto-resume streams that allow it
      for (const streamId of activeMonitoredStreams) {
        try {
          if (contract && wallet) {
            const streamData = await contract.getStream(streamId);
            const isPaused = streamData.isPaused;
            const isActive = streamData.isActive;

            if (!isActive) {
              activeMonitoredStreams.delete(streamId);
              addLog("INFO", `Stream ${streamId} is no longer active. Removed from monitoring.`);
              continue;
            }

            if (isPaused) {
              if (autoResumeStreams.has(streamId)) {
                addLog("INFO", `API healthy & auto-resume enabled for stream ${streamId}. Initiating AI Sentry onchain resume...`);
                addLog("ACTION", `Sending resume transaction for stream ${streamId} to BOTChain...`);
                const tx = await contract.resumeStream(streamId);
                addLog("INFO", `Resumption transaction submitted. Tx Hash: ${tx.hash}`);
                const receipt = await tx.wait();
                addLog("ACTION", `Resumption confirmed in block ${receipt.blockNumber}! Stream ${streamId} resumed successfully.`);
              } else {
                addLog("INFO", `Stream ${streamId} is paused but auto-resume is disabled. Awaiting manual creator resumption.`);
              }
            }
          } else {
            if (autoResumeStreams.has(streamId)) {
              addLog("ACTION", `[DRY-RUN] Would have resumed stream ${streamId} onchain.`);
            }
          }
        } catch (error: any) {
          addLog("ERROR", `Resumption failed for stream ${streamId}: ${error.message}`);
        }
      }
    }
  }, 4000); // Check every 4 seconds

  // Poll new events periodically using standard queryFilter log scanning (bypasses RPC filter limits)
  if (contract) {
    setInterval(async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        if (currentBlock <= lastCheckedBlock) return;

        const fromBlock = lastCheckedBlock + 1;
        const toBlock = currentBlock;

        // Query StreamCreated events
        const createdFilter = contract.filters.StreamCreated();
        const createdEvents = await contract.queryFilter(createdFilter, fromBlock, toBlock);
        for (const event of createdEvents) {
          const [streamId, sender, receivers, sharePercentages, token, deposit, ratePerSecond, startTime, stopTime, sentryNode] = (event as any).args;
          if (wallet && sentryNode.toLowerCase() === wallet.address.toLowerCase()) {
            const id = Number(streamId);
            activeMonitoredStreams.add(id);
            addLog("INFO", `Onchain Event (Log Polled): StreamCreated. Added stream ${id} (Receiver: ${receivers[0]}) to Sentry monitoring list.`);
          }
        }

        // Query StreamPaused events
        const pausedFilter = contract.filters.StreamPaused();
        const pausedEvents = await contract.queryFilter(pausedFilter, fromBlock, toBlock);
        for (const event of pausedEvents) {
          const [streamId, by] = (event as any).args;
          addLog("INFO", `Onchain Event (Log Polled): Stream ${streamId} paused by ${by}.`);
        }

        // Query StreamResumed events
        const resumedFilter = contract.filters.StreamResumed();
        const resumedEvents = await contract.queryFilter(resumedFilter, fromBlock, toBlock);
        for (const event of resumedEvents) {
          const [streamId, by] = (event as any).args;
          addLog("INFO", `Onchain Event (Log Polled): Stream ${streamId} resumed by ${by}.`);
        }

        // Query StreamCancelled events
        const cancelledFilter = contract.filters.StreamCancelled();
        const cancelledEvents = await contract.queryFilter(cancelledFilter, fromBlock, toBlock);
        for (const event of cancelledEvents) {
          const [streamId] = (event as any).args;
          const id = Number(streamId);
          activeMonitoredStreams.delete(id);
          addLog("INFO", `Onchain Event (Log Polled): Stream ${id} cancelled. Removed from Sentry monitoring.`);
        }

        lastCheckedBlock = toBlock;
      } catch (err: any) {
        addLog("WARNING", `Error polling for contract events: ${err.message}`);
      }
    }, 10000); // Check for new events every 10 seconds
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
          providerStatus: providerStatus,
          forceOutageMode: forceOutageMode,
          monitoredStreams: Array.from(activeMonitoredStreams),
          autoResumeStreams: Array.from(autoResumeStreams),
          sentryAddress: wallet ? wallet.address : "0x0000000000000000000000000000000000000000",
          contractAddress: STREAMER_CONTRACT_ADDRESS
        })
      );
    } else if (pathname === "/toggle-force-outage" && req.method === "POST") {
      forceOutageMode = !forceOutageMode;
      addLog("WARNING", `Simulation Override: Outage Force Mode is now ${forceOutageMode ? "ENABLED" : "DISABLED"}`);
      if (!forceOutageMode) {
         providerStatus = "HEALTHY";
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", forceOutageMode }));
    } else if (pathname === "/logs" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(logs));
    } else if (pathname === "/set-auto-resume" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (data.streamId !== undefined && data.autoResume !== undefined) {
            const streamId = Number(data.streamId);
            if (data.autoResume) {
              autoResumeStreams.add(streamId);
              addLog("INFO", `Enabled auto-resume preference for Stream ${streamId}`);
            } else {
              autoResumeStreams.delete(streamId);
              addLog("INFO", `Disabled auto-resume preference for Stream ${streamId}`);
            }
            saveAutoResumeSettings();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "success", autoResumeStreams: Array.from(autoResumeStreams) }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing streamId or autoResume" }));
          }
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
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
