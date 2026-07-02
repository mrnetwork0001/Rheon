import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowDownUp, 
  DollarSign, 
  Coins, 
  Activity, 
  AlertTriangle 
} from 'lucide-react';
import { ethers } from 'ethers';

// Fallback configuration
const DEFAULT_RPC = "https://rpc.botchain.ai";
const SENTRY_API_URL = "http://localhost:4000";

// Mock ABI for minimal interactions
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)"
];

const STREAMER_ABI = [
  "function createStream(address[] receivers, uint256[] sharePercentages, address token, uint256 deposit, uint256 ratePerSecond, address sentryNode) returns (uint256)",
  "function withdrawFromStream(uint256 streamId, uint256 amount)",
  "function pauseStream(uint256 streamId)",
  "function resumeStream(uint256 streamId)",
  "function cancelStream(uint256 streamId)",
  "function getAccrued(uint256 streamId) view returns (uint256)",
  "function streams(uint256) view returns (address sender, address receiver, address token, uint256 deposit, uint256 ratePerSecond, uint256 startTime, uint256 stopTime, uint256 remainingBalance, uint256 accruedUntilLastUpdate, uint256 withdrawnAmount, uint256 lastUpdateTime, address sentryNode, bool isPaused, bool isActive)"
];

const BDEX_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)"
];

function App() {
  const [view, setView] = useState("landing");
  // Web3 state
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("Not Connected");
  const [provider, setProvider] = useState(null);
  const [streamerAddr, setStreamerAddr] = useState(import.meta.env.VITE_STREAMER_CONTRACT_ADDRESS || "");
  const [usdtAddr, setUsdtAddr] = useState(import.meta.env.VITE_USDT_ADDRESS || "");
  const [bdexAddr, setBdexAddr] = useState(import.meta.env.VITE_BDEX_ROUTER_ADDRESS || "0xD6425a02f0845B8D99e349C34D2E7A576E177345");

  // Balance states
  const [botBalance, setBotBalance] = useState("0.0");
  const [usdtBalance, setUsdtBalance] = useState("0.0");

  // Streams state
  const [streams, setStreams] = useState([]);
  const [activeStreamId, setActiveStreamId] = useState(null);
  const [newStream, setNewStream] = useState({
    receiver: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    deposit: "100",
    rate: "0.1",
    sentry: "0x15d34AAf54f6577393b74d6A22e18517860D268A"
  });

  // Swap State
  const [swapFrom, setSwapFrom] = useState("BOT");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapEstimated, setSwapEstimated] = useState("");

  // Sentry Node Integration State
  const [sentryStatus, setSentryStatus] = useState("HEALTHY");
  const [sentryAddress, setSentryAddress] = useState("0x15d34AAf54f6577393b74d6A22e18517860D268A");
  const [sentryLogs, setSentryLogs] = useState([
    { timestamp: new Date().toISOString(), type: "INFO", message: "Sentry dashboard initialized. Waiting for connection..." }
  ]);

  // Real-time ticking counter states
  const [tickerAccrued, setTickerAccrued] = useState(0);
  const [tickerClaimable, setTickerClaimable] = useState(0);
  
  // Wallet Loading states
  const [loading, setLoading] = useState(false);
  
  // Refs
  const tickerIntervalRef = useRef(null);

  // Connect MetaMask and enforce BOT Chain Testnet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use BotFlow.");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const chainIdHex = '0x3c8'; // 968 in hex for BOT testnet
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError) {
        // If the chain hasn't been added, try to add it.
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: 'BOT Chain Testnet',
                nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
                rpcUrls: ['https://rpc.bohr.life'],
                blockExplorerUrls: ['https://scan.bohr.life/']
              }],
            });
          } catch (addError) {
            console.error(addError);
            alert("Failed to add BOT Chain Testnet. Please add it manually.");
            setLoading(false);
            return;
          }
        } else {
          console.error(switchError);
          alert("You must switch to the BOT Chain Testnet to use BotFlow.");
          setLoading(false);
          return;
        }
      }

      // Ensure provider is refreshed after potential network switch
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const net = await web3Provider.getNetwork();
      
      if (net.chainId !== 968n && net.chainId !== 968 && Number(net.chainId) !== 968) {
        alert("Please switch your wallet to BOT Chain Testnet (Chain ID 968) to proceed.");
        setLoading(false);
        return;
      }
      
      setAccount(accounts[0]);
      setProvider(web3Provider);
      setNetwork("BOT Chain Testnet");
      
      // Load balances
      await updateBalances(accounts[0], web3Provider);
      addSentryLog("INFO", `Connected wallet: ${accounts[0]} on BOT Chain Testnet`);
    } catch (error) {
      console.error(error);
      addSentryLog("ERROR", `Failed to connect wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setAccount("");
    setNetwork("Not Connected");
    setProvider(null);
    setBotBalance("0.0");
    setUsdtBalance("0.0");
    setStreams([]);
    setActiveStreamId(null);
    addSentryLog("INFO", "Wallet disconnected.");
  };

  // Fetch balances
  const updateBalances = async (addr, web3Provider) => {
    if (!addr || !web3Provider) return;
    try {
      const balanceWei = await web3Provider.getBalance(addr);
      setBotBalance(parseFloat(ethers.formatEther(balanceWei)).toFixed(4));
      
      if (usdtAddr) {
        const tokenContract = new ethers.Contract(usdtAddr, ERC20_ABI, web3Provider);
        const usdtBal = await tokenContract.balanceOf(addr);
        setUsdtBalance(parseFloat(ethers.formatUnits(usdtBal, 6)).toFixed(2));
      }
    } catch (e) {
      console.error("Balance fetch error:", e);
    }
  };

  // Fetch Sentry Server Status and Logs
  const fetchSentryData = async () => {
    try {
      const resStatus = await fetch(`${SENTRY_API_URL}/status`);
      const statusData = await resStatus.json();
      setSentryStatus(statusData.providerStatus);
      if (statusData.sentryAddress) {
        setSentryAddress(statusData.sentryAddress);
      }

      const resLogs = await fetch(`${SENTRY_API_URL}/logs`);
      const logsData = await resLogs.json();
      setSentryLogs(logsData);
    } catch (err) {
      // Sentry server offline - keep logs clean but don't crash
    }
  };

  const addSentryLog = (type, message) => {
    setSentryLogs(prev => [
      { timestamp: new Date().toISOString(), type, message },
      ...prev.slice(0, 49)
    ]);
  };

  useEffect(() => {
    // Poll Sentry API
    const interval = setInterval(fetchSentryData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle trigger outage simulation
  const simulateSentryAction = async (statusType) => {
    addSentryLog("INFO", `Triggering simulated status: ${statusType}`);
    try {
      let endpoint = "/simulate-healthy";
      if (statusType === "OUTAGE") endpoint = "/simulate-outage";
      if (statusType === "DISPUTE") endpoint = "/simulate-dispute";

      const res = await fetch(`${SENTRY_API_URL}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      setSentryStatus(data.providerStatus);

      // In production, the backend Sentry Node will automatically call pauseStream
      // on the smart contract when OUTAGE or DISPUTE is triggered.
    } catch (err) {
      alert("Sentry Node Server not running. Launch it using `npm start` in the sentry folder to test live API controls.");
    }
  };

  // Create stream implementation
  const handleCreateStream = async (e) => {
    e.preventDefault();
    const depVal = parseFloat(newStream.deposit);
    const rateVal = parseFloat(newStream.rate);

    if (isNaN(depVal) || isNaN(rateVal) || depVal <= 0 || rateVal <= 0) {
      alert("Invalid deposit or stream rate");
      return;
    }

    // Live Web3
    if (!provider) return;
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      const tokenContract = new ethers.Contract(usdtAddr, ERC20_ABI, signer);
      
      // Approve
      const amountWei = ethers.parseUnits(newStream.deposit, 6);
      addSentryLog("INFO", "Approving USDT for streaming...");
      const appTx = await tokenContract.approve(streamerAddr, amountWei);
      await appTx.wait();
      addSentryLog("INFO", "Approval confirmed. Creating stream...");

      const rateWei = ethers.parseUnits(newStream.rate, 6);
      
      // Phase 1: Revenue Splitting Arrays (Hardcoded 70/20/10 for hackathon demo)
      const receivers = [
        newStream.receiver, 
        "0x1111111111111111111111111111111111111111", // Dev/Creator Wallet
        "0x2222222222222222222222222222222222222222"  // DAO Treasury
      ];
      const percentages = [70, 20, 10];

      const tx = await streamerContract.createStream(
        receivers,
        percentages,
        usdtAddr,
        amountWei,
        rateWei,
        newStream.sentry
      );
        addSentryLog("INFO", `Stream transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        addSentryLog("INFO", `Stream successfully created in block ${receipt.blockNumber}!`);
        
        // Reload balances & streams
        await updateBalances(account, provider);
      } catch (error) {
        console.error(error);
        addSentryLog("ERROR", `Failed to create stream: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Perform Swap Web3 implementation
  const handleSwap = async (e) => {
    e.preventDefault();
    const amount = parseFloat(swapAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (!provider) return;
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const bdexContract = new ethers.Contract(bdexAddr, BDEX_ABI, signer);
      
      const WBOT = "0xD5452816194a3784dBa983426cCe7c122F4abd30";
      const USDT = usdtAddr;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins from now

      if (swapFrom === "BOT") {
        addSentryLog("INFO", `Swapping ${amount} BOT to USDT...`);
        const valueWei = ethers.parseEther(swapAmount);
        const path = [WBOT, USDT];
        
        const tx = await bdexContract.swapExactETHForTokens(
          0, // amountOutMin (0 for demo, ideally calculated to prevent slippage)
          path,
          account,
          deadline,
          { value: valueWei }
        );
        await tx.wait();
        addSentryLog("INFO", "BOT to USDT Swap completed successfully.");
      } else {
        addSentryLog("INFO", `Swapping ${amount} USDT to BOT...`);
        const tokenContract = new ethers.Contract(usdtAddr, ERC20_ABI, signer);
        const usdtWei = ethers.parseUnits(swapAmount, 6); // Assuming 6 decimals for USDT
        const path = [USDT, WBOT];
        
        // Approve BDEX Router
        addSentryLog("INFO", "Approving USDT for swap...");
        const appTx = await tokenContract.approve(bdexAddr, usdtWei);
        await appTx.wait();
        
        const tx = await bdexContract.swapExactTokensForETH(
          usdtWei,
          0, // amountOutMin
          path,
          account,
          deadline
        );
        await tx.wait();
        addSentryLog("INFO", "USDT to BOT Swap completed successfully.");
      }
      setSwapAmount("");
      setSwapEstimated("");
      await updateBalances(account, provider);
    } catch (error) {
      console.error(error);
      addSentryLog("ERROR", `Swap failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Accrual math helper
  const calculateAccrued = (stream) => {
    if (!stream.isActive) return 0;
    
    let totalAccrued = stream.accruedAtLastUpdate;
    if (!stream.isPaused) {
      const current = Date.now();
      const end = Math.min(current, stream.stopTime);
      const start = stream.lastUpdateTime;
      if (end > start) {
        const timePassedSec = (end - start) / 1000;
        totalAccrued += timePassedSec * stream.ratePerSecond;
      }
    }
    return Math.min(totalAccrued, stream.deposit);
  };

  // Pause / Resume Streams
  const toggleStreamPause = async (id) => {
    if (!provider) return;
    try {
      setLoading(true);
      const str = streams.find(s => s.id === id);
      if (!str) return;
      
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      if (str.isPaused) {
        addSentryLog("INFO", `Resuming stream ${id}...`);
        const tx = await streamerContract.resumeStream(id);
        await tx.wait();
        addSentryLog("INFO", `Stream ${id} resumed.`);
      } else {
        addSentryLog("INFO", `Pausing stream ${id}...`);
        const tx = await streamerContract.pauseStream(id);
        await tx.wait();
        addSentryLog("INFO", `Stream ${id} paused.`);
      }
      await updateBalances(account, provider);
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to toggle pause: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw stream tokens
  const handleWithdraw = async (id) => {
    if (!provider) return;
    try {
      setLoading(true);
      const str = streams.find(s => s.id === id);
      if (!str) return;
      
      const currentAccrued = calculateAccrued(str);
      const claimable = currentAccrued - str.withdrawn;
      if (claimable <= 0.01) {
        alert("Nothing accrued to withdraw yet");
        return;
      }
      
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      addSentryLog("INFO", `Withdrawing from stream ${id}...`);
      const claimableWei = ethers.parseUnits(claimable.toFixed(6), 6);
      const tx = await streamerContract.withdrawFromStream(id, claimableWei);
      await tx.wait();
      addSentryLog("ACTION", `Withdrawn ${claimable.toFixed(4)} USDT from Stream ${id}`);
      
      await updateBalances(account, provider);
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to withdraw: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Stream
  const handleCancelStream = async (id) => {
    if (!provider) return;
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      addSentryLog("INFO", `Cancelling stream ${id}...`);
      const tx = await streamerContract.cancelStream(id);
      await tx.wait();
      addSentryLog("ACTION", `Stream ${id} cancelled successfully.`);
      
      await updateBalances(account, provider);
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to cancel stream: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Real-time animation logic
  useEffect(() => {
    const activeStr = streams.find(s => s.id === activeStreamId);
    if (!activeStr || !activeStr.isActive) {
      setTickerAccrued(0);
      setTickerClaimable(0);
      return;
    }

    const tick = () => {
      const totalAccrued = calculateAccrued(activeStr);
      const claimable = totalAccrued - activeStr.withdrawn;
      setTickerAccrued(totalAccrued);
      setTickerClaimable(claimable);
      
      tickerIntervalRef.current = requestAnimationFrame(tick);
    };

    tickerIntervalRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(tickerIntervalRef.current);
  }, [activeStreamId, streams]);

  // Real-time swap quote estimation
  useEffect(() => {
    const fetchQuote = async () => {
      const numeric = parseFloat(swapAmount);
      if (isNaN(numeric) || numeric <= 0 || !provider) {
        setSwapEstimated("");
        return;
      }
      try {
        const bdexContract = new ethers.Contract(bdexAddr, BDEX_ABI, provider);
        const WBOT = "0xD5452816194a3784dBa983426cCe7c122F4abd30";
        const USDT = usdtAddr;
        let amountInWei, path;
        
        if (swapFrom === "BOT") {
          amountInWei = ethers.parseEther(swapAmount);
          path = [WBOT, USDT];
        } else {
          amountInWei = ethers.parseUnits(swapAmount, 6);
          path = [USDT, WBOT];
        }
        
        const amounts = await bdexContract.getAmountsOut(amountInWei, path);
        
        if (swapFrom === "BOT") {
          setSwapEstimated(ethers.formatUnits(amounts[1], 6));
        } else {
          setSwapEstimated(ethers.formatEther(amounts[1]));
        }
      } catch (err) {
        console.error("Quote error:", err);
        setSwapEstimated("Error fetching quote");
      }
    };
    
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [swapAmount, swapFrom, provider, usdtAddr, bdexAddr]);

  // Handle swap input change
  const handleSwapAmountChange = (val) => {
    setSwapAmount(val);
  };

  const currentActiveStream = streams.find(s => s.id === activeStreamId);

  if (view === "landing") {
    return (
      <div className="container">
        {/* Navigation Bar */}
        <nav className="landing-navbar">
          <div className="brand" onClick={() => setView("landing")} style={{ cursor: 'pointer' }}>
            <span className="brand-logo">🌊</span>
            <div>
              <h2 className="brand-name" style={{ fontSize: '1.5rem' }}>BotFlow</h2>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', display: 'block' }}>AI-SHIELDED PAYFI</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setView("app")}>
            Launch App
            <Zap size={16} />
          </button>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-glow"></div>
          <h1 className="hero-title">The Real-Time PayFi Protocol for AI Agents</h1>
          <p className="hero-subtitle">
            Stream micro-payments to AI agents, games, and DePIN nodes with sub-second finality. 
            Protected by automated Sentry Nodes that auto-pause flows during service outages or disputes.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => setView("app")}>
              Launch Console
              <Zap size={18} />
            </button>
            <a href="https://github.com/mrnetwork0001/BOTflow" target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
              Explore Codebase
            </a>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-val">~0.75s</span>
              <span className="stat-lbl">Block Speed</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">&lt; $0.0001</span>
              <span className="stat-lbl">Avg Gas Fee</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">100%</span>
              <span className="stat-lbl">Sentry Shielded</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-header">
            <h2 className="section-title">Engineered for real-time value transfer</h2>
            <p className="section-subtitle">
              Leveraging BOT Chain's high-speed L1 capabilities, BotFlow establishes trustless streaming channels.
            </p>
          </div>

          <div className="feature-cards-grid">
            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <Zap size={24} />
              </div>
              <h3 className="feature-title">Real-Time Streaming</h3>
              <p className="feature-desc">
                Stream assets continuously to endpoints with sub-second pro-rata updates. Claim funds instantly whenever you need them.
              </p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={24} />
              </div>
              <h3 className="feature-title">AI Sentry Guards</h3>
              <p className="feature-desc">
                Autonomous oracle agents monitor provider performance and automatically execute emergency pause signals on-chain during disputes.
              </p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <ArrowDownUp size={24} />
              </div>
              <h3 className="feature-title">BDEX Swap Portal</h3>
              <p className="feature-desc">
                Swap between native gas $BOT tokens and $USDT streams in a single transaction with instant confirmation.
              </p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <Coins size={24} />
              </div>
              <h3 className="feature-title">AI Agent Micropayments</h3>
              <p className="feature-desc">
                Perfect for PayFi loops: pay for LLM inferences, API compute, and content streaming only for the exact amount consumed.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="workflow-section">
          <div className="section-header">
            <h2 className="section-title">How BotFlow Works</h2>
            <p className="section-subtitle">A secure PayFi channel in three simple steps.</p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-step">
              <div className="workflow-number">01</div>
              <h3 className="workflow-step-title">Initialize Stream</h3>
              <p className="workflow-step-desc">Deposit USDT, set your per-second flow rate, and designate an AI Sentry monitor address.</p>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">02</div>
              <h3 className="workflow-step-title">Sentry Node Monitoring</h3>
              <p className="workflow-step-desc">The AI Sentry node continuously health-checks the recipient and protects your tokens.</p>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">03</div>
              <h3 className="workflow-step-title">Claim & Settle</h3>
              <p className="workflow-step-desc">The receiver withdraws accrued funds. Sentry triggers auto-pauses if service outages are detected.</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <div className="cta-banner">
          <div className="cta-content">
            <h2 className="cta-title">Ready to launch your streaming channel?</h2>
            <p className="cta-desc">Experience real-time sub-second on-chain transactions today on BOT Chain.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setView("app")}>
              Launch Console
              <Zap size={18} />
            </button>
          </div>
        </div>

        <footer>
          <p>© 2026 BotFlow. Built for the BOT Chain Builder Challenge #1.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div className="brand" onClick={() => setView("landing")} style={{ cursor: "pointer" }}>
          <span className="brand-logo">🌊</span>
          <div>
            <h1 className="brand-name">BotFlow</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>AI-SHIELDED PAYFI HUB</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="network-badge">
            <span className="network-dot"></span>
            {network}
          </div>
          {!account ? (
            <button className="btn btn-connect" onClick={connectWallet} disabled={loading}>
              <Zap size={16} />
              Connect BOT Wallet
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={disconnectWallet}>
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* Main Dashboard Section */}
      <div className="grid-layout">
        
        {/* Left Side: Realtime Ticker & Stream List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Ticking Counter */}
          <div className="glass-card">
            <div className="live-counter-container">
              <span className="live-counter-label">Active Flow Accumulation</span>
              <div className="live-ticker">
                {tickerAccrued.toFixed(6)}
                <span className="live-ticker-symbol">USDT</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-family-mono)' }}>Claimable Balance</span>
                <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                  {tickerClaimable.toFixed(4)} USDT
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                {currentActiveStream && currentActiveStream.isActive && (
                  <>
                    <button 
                      className={`btn ${currentActiveStream.isPaused ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => toggleStreamPause(currentActiveStream.id)}
                    >
                      {currentActiveStream.isPaused ? <Play size={16} /> : <Pause size={16} />}
                      {currentActiveStream.isPaused ? "Resume" : "Pause"}
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleWithdraw(currentActiveStream.id)}
                      disabled={tickerClaimable <= 0.01}
                    >
                      <RotateCcw size={16} />
                      Withdraw
                    </button>
                  </>
                )}
              </div>
            </div>

            {currentActiveStream && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Sender</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>{currentActiveStream.sender}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Receiver (AI Agent/Provider)</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>{currentActiveStream.receiver}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Flow Rate</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-cyan)' }}>{currentActiveStream.ratePerSecond} USDT/sec</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Initial Locked Deposit</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)' }}>{currentActiveStream.deposit} USDT</span>
                </div>
              </div>
            )}
          </div>

          {/* Active Streams Panel */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins size={20} className="text-cyan" />
              Your Payment Streams
            </h3>
            
            <div className="stream-list">
              {streams.map(stream => (
                <div 
                  key={stream.id} 
                  className={`stream-card ${stream.id === activeStreamId ? 'active' : ''} ${stream.isPaused ? 'paused' : ''} ${!stream.isActive ? 'depleted' : ''}`}
                  onClick={() => stream.isActive && setActiveStreamId(stream.id)}
                  style={{ cursor: stream.isActive ? 'pointer' : 'default' }}
                >
                  <div className="stream-info">
                    <span className="stream-party">Stream #{stream.id} to AI Agent</span>
                    <span className="stream-meta">
                      <span>Rate: <span className="stream-rate">{stream.ratePerSecond} USDT/sec</span></span>
                      <span>Withdrawn: {stream.withdrawn.toFixed(2)} / {stream.deposit} USDT</span>
                    </span>
                    {!stream.isActive && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>CANCELLED / DEPLETED</span>}
                  </div>
                  
                  <div className="stream-action-group" onClick={e => e.stopPropagation()}>
                    {stream.isActive && (
                      <>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => toggleStreamPause(stream.id)}
                        >
                          {stream.isPaused ? "Resume" : "Pause"}
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => handleCancelStream(stream.id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Stream Panel */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} className="text-cyan" />
              Initialize New Stream
            </h3>
            
            <form onSubmit={handleCreateStream}>
              <div className="form-group">
                <label className="form-label">Receiver (AI Service Provider Address)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newStream.receiver}
                  onChange={e => setNewStream({...newStream, receiver: e.target.value})}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Initial Deposit ($USDT)</label>
                  <div className="input-container">
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newStream.deposit}
                      onChange={e => setNewStream({...newStream, deposit: e.target.value})}
                      required
                    />
                    <span className="input-suffix">USDT</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Flow Rate ($USDT/Sec)</label>
                  <div className="input-container">
                    <input 
                      type="number" 
                      step="0.001"
                      className="input-field" 
                      value={newStream.rate}
                      onChange={e => setNewStream({...newStream, rate: e.target.value})}
                      required
                    />
                    <span className="input-suffix">/ SEC</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Authorized Sentry Node (AI Sentry)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newStream.sentry}
                  onChange={e => setNewStream({...newStream, sentry: e.target.value})}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                <Zap size={16} />
                Open Stream
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: BDEX Swap widget & Sentry Monitor Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Wallet Balances Card */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(13, 17, 30, 0.8) 0%, rgba(20, 10, 45, 0.4) 100%)' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Your Ledger Wallet</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', fontFamily: 'var(--font-family-mono)' }}>NATIVE BOT</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{botBalance}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'block' }}>Gas Asset</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', fontFamily: 'var(--font-family-mono)' }}>USDT TOKEN</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{usdtBalance}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', display: 'block' }}>Stream Asset</span>
              </div>
            </div>
          </div>

          {/* BDEX Swap Portal */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowDownUp size={20} className="text-cyan" />
              BDEX Swap Portal
            </h3>
            
            <form onSubmit={handleSwap}>
              <div className="swap-container">
                <div className="swap-input-block">
                  <div className="swap-meta-info">
                    <span>Pay</span>
                    <span>Balance: {swapFrom === "BOT" ? botBalance : usdtBalance}</span>
                  </div>
                  <div className="swap-input-row">
                    <input 
                      type="number" 
                      step="0.0001"
                      className="swap-input" 
                      placeholder="0.0" 
                      value={swapAmount}
                      onChange={e => handleSwapAmountChange(e.target.value)}
                      required
                    />
                    <span className="swap-token-select">{swapFrom}</span>
                  </div>
                </div>

                <div className="swap-divider">
                  <div className="swap-arrow" onClick={() => setSwapFrom(prev => prev === "BOT" ? "USDT" : "BOT")}>
                    <ArrowDownUp size={16} />
                  </div>
                </div>

                <div className="swap-input-block">
                  <div className="swap-meta-info">
                    <span>Receive (Estimated)</span>
                    <span>Balance: {swapFrom === "BOT" ? usdtBalance : botBalance}</span>
                  </div>
                  <div className="swap-input-row">
                    <input 
                      type="text" 
                      className="swap-input" 
                      placeholder="0.0" 
                      value={swapEstimated} 
                      readOnly 
                    />
                    <span className="swap-token-select">{swapFrom === "BOT" ? "USDT" : "BOT"}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '1rem 0 0.5rem 0', textAlign: 'center', fontFamily: 'var(--font-family-mono)' }}>
                Rate: 1 BOT = 2 USDT
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !swapAmount}>
                Swap Assets
              </button>
            </form>
          </div>

          {/* AI Sentry Node Status Panel */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} style={{ color: 'var(--state-success)' }} />
              AI Sentry Node Console
            </h3>

            <div className="sentry-panel">
              <div className="sentry-status-header">
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-family-mono)' }}>Sentry Monitor Address</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{sentryAddress}</span>
                </div>
                <div className={`sentry-health-tag ${sentryStatus.toLowerCase()}`}>
                  <span className="network-dot" style={{ backgroundColor: sentryStatus === "HEALTHY" ? 'var(--state-success)' : sentryStatus === "OUTAGE" ? 'var(--state-error)' : 'var(--state-warning)' }}></span>
                  {sentryStatus}
                </div>
              </div>

              {/* Simulation triggers */}
              <div>
                <span className="form-label" style={{ marginBottom: '0.5rem' }}>Simulate Network Provider Events</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-success" 
                    style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                    onClick={() => simulateSentryAction("HEALTHY")}
                  >
                    Restore Healthy
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                    onClick={() => simulateSentryAction("OUTAGE")}
                  >
                    Outage (Auto Pause)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.75rem', padding: '0.5rem', color: 'var(--state-warning)', borderColor: 'var(--state-warning)' }}
                    onClick={() => simulateSentryAction("DISPUTE")}
                  >
                    User Dispute
                  </button>
                </div>
              </div>

              {/* Sentry Logs View */}
              <div>
                <span className="form-label">Sentry Activity Feed</span>
                <div className="sentry-logs-view">
                  {sentryLogs.map((log, idx) => (
                    <div key={idx} className={`log-line ${log.type.toLowerCase()}`}>
                      [{log.timestamp.split('T')[1].split('.')[0]}] [{log.type}] {log.message}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
