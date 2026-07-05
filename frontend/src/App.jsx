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
  "function disputeStream(uint256 streamId)",
  "function resolveDispute(uint256 streamId, bool refundUser)",
  "function getAccrued(uint256 streamId) view returns (uint256)",
  "function getStream(uint256 streamId) view returns (tuple(address sender, address[] receivers, uint256[] sharePercentages, address token, uint256 deposit, uint256 ratePerSecond, uint256 startTime, uint256 stopTime, uint256 remainingBalance, uint256 accruedUntilLastUpdate, uint256 withdrawnAmount, uint256 lastUpdateTime, address sentryNode, bool isPaused, bool isDisputed, bool isActive))",
  "function nextStreamId() view returns (uint256)",
  "function daoContract() view returns (address)"
];

const DAO_ABI = [
  "function vote(uint256 streamId, bool refundUser)",
  "function executeResolution(uint256 streamId)"
];

const BDEX_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)"
];

function App() {
  const [view, setView] = useState("landing");
  const [dashboardView, setDashboardView] = useState("creator");
  // Web3 state
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("Not Connected");
  const [provider, setProvider] = useState(null);
  const [streamerAddr, setStreamerAddr] = useState(import.meta.env.VITE_STREAMER_CONTRACT_ADDRESS || "");
  const [usdtAddr, setUsdtAddr] = useState(import.meta.env.VITE_USDT_ADDRESS || "");
  const [bdexAddr, setBdexAddr] = useState(import.meta.env.VITE_BDEX_ROUTER_ADDRESS || "0xD6425a02f0845B8D99e349C34D2E7A576E177345");
  // Hardcoded for demo: assumes DAO deployed right after Streamer at a nearby nonce
  const [daoAddr, setDaoAddr] = useState("");
  // Balance states
  const [botBalance, setBotBalance] = useState("0.0");
  const [usdtBalance, setUsdtBalance] = useState("0.0");

  // Streams state
  const [streams, setStreams] = useState([]);
  const [activeStreamId, setActiveStreamId] = useState(null);
  const [newStream, setNewStream] = useState({
    receiver: "",
    deposit: "",
    rate: "0.1",
    sentry: "0x15d34aaf54f6577393b74d6a22e18517860d268a"
  });

  // Swap State
  const [swapFrom, setSwapFrom] = useState("BOT");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapEstimated, setSwapEstimated] = useState("");

  // Sentry Node Integration State
  const [sentryStatus, setSentryStatus] = useState("HEALTHY");
  const [sentryAddress, setSentryAddress] = useState("0x15d34aaf54f6577393b74d6a22e18517860d268a");
  const [sentryLogs, setSentryLogs] = useState([
    { timestamp: new Date().toISOString(), type: "INFO", message: "Sentry dashboard initialized. Waiting for connection..." }
  ]);
  const [forceOutage, setForceOutage] = useState(false);

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
      alert("MetaMask is not installed. Please install it to use Rheon.");
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
          alert("You must switch to the BOT Chain Testnet to use Rheon.");
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

  // Real-time polling function
  const fetchRealtimeData = async () => {
    if (!account || !provider || !streamerAddr) return;
    try {
      // 1. Update balances
      await updateBalances(account, provider);
      
      // 2. Fetch streams in parallel from the blockchain
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, provider);
      const nextId = await streamerContract.nextStreamId();
      const totalStreams = Number(nextId) - 1;
      
      const promises = [];
      for (let i = 1; i <= totalStreams; i++) {
        promises.push(streamerContract.getStream(i));
      }
      const results = await Promise.all(promises);
      
      let fetchedStreams = [];
      for (let i = 0; i < results.length; i++) {
        const s = results[i];
        const streamId = i + 1;
        const sender = s.sender.toLowerCase();
        const currentUser = account.toLowerCase();
        
        // Check if current user is the sender or one of the receivers in the split array
        const isReceiver = s.receivers.some(r => r.toLowerCase() === currentUser);
        
        if (sender === currentUser || isReceiver) {
          fetchedStreams.push({
            id: streamId,
            sender: s.sender,
            receiver: s.receivers[0], // Display the primary AI provider address in the UI
            tokenName: "USDT",
            deposit: parseFloat(ethers.formatUnits(s.deposit, 6)),
            ratePerSecond: parseFloat(ethers.formatUnits(s.ratePerSecond, 6)),
            startTime: Number(s.startTime) * 1000,
            stopTime: Number(s.stopTime) * 1000,
            withdrawn: parseFloat(ethers.formatUnits(s.withdrawnAmount, 6)),
            isPaused: s.isPaused,
            isDisputed: s.isDisputed,
            isActive: s.isActive,
            sentryNode: s.sentryNode,
            accruedAtLastUpdate: parseFloat(ethers.formatUnits(s.accruedUntilLastUpdate, 6)),
            lastUpdateTime: Number(s.lastUpdateTime) * 1000
          });
        }
      }
      setStreams(fetchedStreams);
    } catch (e) {
      console.error("Error fetching real-time data:", e);
    }
  };

  // Setup polling interval when connected
  useEffect(() => {
    if (account && provider) {
      fetchRealtimeData();
      const interval = setInterval(fetchRealtimeData, 5000); // 5 seconds real-time sync
      return () => clearInterval(interval);
    }
  }, [account, provider, streamerAddr]);

  // Auto-select active stream when switching dashboards
  useEffect(() => {
    if (!account) return;
    const displayed = streams.filter(s => 
      dashboardView === "creator" 
        ? s.sender.toLowerCase() === account.toLowerCase() 
        : s.sender.toLowerCase() !== account.toLowerCase()
    );
    if (displayed.length > 0) {
      if (!displayed.some(s => s.id === activeStreamId)) {
        setActiveStreamId(displayed[0].id);
      }
    } else {
      setActiveStreamId(null);
    }
  }, [dashboardView, streams, account, activeStreamId]);

  // Fetch Sentry Server Status and Logs
  const fetchSentryData = async () => {
    try {
      const resStatus = await fetch(`${SENTRY_API_URL}/status`);
      const statusData = await resStatus.json();
      setSentryStatus(statusData.providerStatus);
      setForceOutage(statusData.forceOutageMode || false);
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

  const handleToggleForceOutage = async () => {
    try {
      const res = await fetch(`${SENTRY_API_URL}/toggle-force-outage`, { method: "POST" });
      const data = await res.json();
      setForceOutage(data.forceOutageMode);
      addSentryLog("WARNING", `Outage Simulation toggled: ${data.forceOutageMode ? "ON" : "OFF"}`);
    } catch (err) {
      alert("Failed to connect to Sentry Node. Is it running on port 4000?");
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



  // Create stream implementation
  const handleCreateStream = async (e) => {
    e.preventDefault();
    const depVal = parseFloat(newStream.deposit);
    const rateVal = parseFloat(newStream.rate);

    if (isNaN(depVal) || isNaN(rateVal) || depVal <= 0 || rateVal <= 0) {
      alert("Invalid deposit or stream rate");
      return;
    }

    if (depVal > parseFloat(usdtBalance)) {
      alert("Insufficient USDT balance. You must have at least the initial deposit amount in your wallet.");
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
      
      // Phase 1: Revenue Splitting Arrays (70/20/10 Split)
      const devWallet = import.meta.env.VITE_DEV_WALLET || "0x1111111111111111111111111111111111111111";
      const daoTreasury = import.meta.env.VITE_DAO_TREASURY || "0x2222222222222222222222222222222222222222";
      
      const receivers = [
        newStream.receiver, 
        devWallet, 
        daoTreasury
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
        
        // Sync real-time data from blockchain instead of local mock state
        await fetchRealtimeData();
        
        // Find the newest stream to set as active
        const nextId = await streamerContract.nextStreamId();
        setActiveStreamId(Number(nextId) - 1);
      } catch (error) {
        console.error(error);
        addSentryLog("ERROR", `Failed to create stream: ${error.message}`);
      } finally {
        setLoading(false);
      }
  };

  // Perform Swap Web3 implementation
  const handleSwap = async (e) => {
    e.preventDefault();
    const amount = parseFloat(swapAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (swapFrom === "BOT" && amount > parseFloat(botBalance)) {
      alert("Insufficient BOT balance for this swap.");
      return;
    }
    if (swapFrom === "USDT" && amount > parseFloat(usdtBalance)) {
      alert("Insufficient USDT balance for this swap.");
      return;
    }

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
      addSentryLog("INFO", `Stream ${id} cancelled and NFT Receipt Minted!`);
      
      setStreams(streams.map(s => s.id === id ? { ...s, isActive: false } : s));
      await updateBalances(account, provider);
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to cancel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Feature 4: Dispute Stream
  const handleDisputeStream = async (id) => {
    if (!provider) return;
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      addSentryLog("INFO", `Opening dispute for stream ${id}...`);
      const tx = await streamerContract.disputeStream(id);
      await tx.wait();
      addSentryLog("INFO", `Stream ${id} disputed and frozen.`);
      
      setStreams(streams.map(s => s.id === id ? { ...s, isPaused: true, isDisputed: true } : s));
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to dispute: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Feature 4: DAO Resolve Dispute
  const handleResolveDispute = async (id, refundUser) => {
    if (!provider) return;
    
    // Resolve DAO address if not loaded
    let currentDaoAddr = daoAddr;
    try {
      if (!currentDaoAddr) {
        const signer = await provider.getSigner();
        const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
        currentDaoAddr = await streamerContract.daoContract();
        setDaoAddr(currentDaoAddr);
      }
    } catch (err) {
      console.error("Failed to fetch DAO address from contract:", err);
      addSentryLog("ERROR", "Failed to resolve DAO contract address.");
      return;
    }

    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const daoContract = new ethers.Contract(currentDaoAddr, DAO_ABI, signer);
      
      addSentryLog("INFO", `Submitting DAO Vote: ${refundUser ? 'REFUND' : 'RESUME'}...`);
      const txVote = await daoContract.vote(id, refundUser);
      await txVote.wait();
      
      addSentryLog("INFO", `Vote registered. Executing resolution on-chain...`);
      const txExec = await daoContract.executeResolution(id);
      await txExec.wait();
      
      addSentryLog("INFO", `DAO Resolution executed! Dispute resolved on-chain.`);
      await fetchRealtimeData();
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `DAO Resolution failed: ${err.reason || err.message}`);
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
              <h2 className="brand-name" style={{ fontSize: '1.5rem' }}>Rheon</h2>
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
          <div className="hero-container">
            <div className="hero-content-left">
              <h1 className="hero-title">The Real-Time PayFi Protocol for AI Agents</h1>
              <p className="hero-subtitle">
                Stream micro-payments to AI agents with sub-second finality. Featuring automated revenue splitting, idle deposit yield generation, and a decentralized dispute DAO.
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
            </div>
            <div className="hero-media-right">
              <img 
                src="/images/hero_ai_payfi.png" 
                className="hero-illustration" 
                alt="Rheon AI PayFi" 
              />
            </div>
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
              Leveraging BOT Chain's high-speed L1 capabilities, Rheon establishes trustless streaming channels.
            </p>
          </div>

          <div className="feature-cards-grid">
            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <Zap size={24} />
              </div>
              <h3 className="feature-title">Automated Revenue Splits</h3>
              <p className="feature-desc">
                Streams automatically split 70% to AI Providers, 20% to Dev Wallets, and 10% to the BOT DAO Treasury.
              </p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={24} />
              </div>
              <h3 className="feature-title">"Proof-of-Compute" NFTs</h3>
              <p className="feature-desc">
                Ending a stream automatically mints an immutable ERC721 receipt proving the AI agent's compute work.
              </p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <ArrowDownUp size={24} />
              </div>
              <h3 className="feature-title">DeFi Yield Vaults</h3>
              <p className="feature-desc">
                Locked deposits don't sit idle. They are routed to a DeFi Vault to generate a 5% APY until streamed.
              </p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon-wrapper">
                <Coins size={24} />
              </div>
              <h3 className="feature-title">Decentralized Dispute DAO</h3>
              <p className="feature-desc">
                Freeze rogue streams and submit them to the community DAO for a fully on-chain resolution and refund vote.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="workflow-section">
          <div className="section-header">
            <h2 className="section-title">How Rheon Works</h2>
            <p className="section-subtitle">A secure PayFi channel in three simple steps.</p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-step">
              <div className="workflow-number">01</div>
              <h3 className="workflow-step-title">Initialize & Yield</h3>
              <p className="workflow-step-desc">Deposit USDT (which routes to a Yield Vault) and set the flow rate with an automated 70/20/10 split.</p>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">02</div>
              <h3 className="workflow-step-title">Stream & DAO Shield</h3>
              <p className="workflow-step-desc">Stream in real-time. If the AI agent fails, open a DAO Dispute to freeze the stream and vote for a refund.</p>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">03</div>
              <h3 className="workflow-step-title">Cancel & Mint</h3>
              <p className="workflow-step-desc">When the stream depletes or is manually cancelled, an immutable NFT Receipt is minted as Proof-of-Compute.</p>
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

        <footer className="landing-footer">
          <div className="footer-content">
            <div className="footer-brand-section">
              <div className="brand" onClick={() => setView("landing")} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                <span className="brand-logo">🌊</span>
                <span className="brand-name" style={{ fontSize: '1.25rem' }}>Rheon</span>
              </div>
              <p className="footer-desc">
                AI-shielded real-time streaming payments and decentralized dispute resolution on BOT Chain.
              </p>
              <div className="footer-socials">
                <a href="#" aria-label="X (Twitter)">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://github.com/mrnetwork0001/BOTflow" target="_blank" rel="noreferrer" aria-label="GitHub">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                </a>
              </div>
            </div>

            <div className="footer-links-container">
              <div className="footer-col">
                <h4>PROTOCOL</h4>
                <a href="#">Features</a>
                <a href="#">AI-Shield</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setView("app"); }}>Launch App</a>
              </div>
              <div className="footer-col">
                <h4>ECOSYSTEM</h4>
                <a href="#">BOT Chain Explorer</a>
                <a href="#">BOT Wallet</a>
                <a href="#">DAO Treasury</a>
                <a href="#">DeFi Yield Vaults</a>
              </div>
              <div className="footer-col">
                <h4>RESOURCES</h4>
                <a href="#">Docs</a>
                <a href="#">Contracts</a>
                <a href="#">BDEX Swap</a>
              </div>
            </div>
          </div>
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
            <h1 className="brand-name">Rheon</h1>
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
      <div className="dashboard-toggle-container">
        <div className="dashboard-toggle">
          <button 
            className={dashboardView === "creator" ? "active" : ""} 
            onClick={() => setDashboardView("creator")}
          >
            Creator View
          </button>
          <button 
            className={dashboardView === "recipient" ? "active" : ""} 
            onClick={() => setDashboardView("recipient")}
          >
            Recipient View
          </button>
        </div>
      </div>

      {dashboardView === "creator" && (
        <div className="dashboard-metrics">
          <div className="metric-card">
            <span className="metric-label">Total Value Locked</span>
            <span className="metric-value">
              {streams
                .filter(s => s.sender.toLowerCase() === account.toLowerCase() && s.isActive)
                .reduce((acc, s) => acc + s.deposit, 0)
                .toFixed(2)} USDT
            </span>
            <span className="metric-subtext">
              Across {streams.filter(s => s.sender.toLowerCase() === account.toLowerCase() && s.isActive).length} active streams
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">DeFi Yield Earned</span>
            <span className="metric-value" style={{ color: "var(--accent-cyan)" }}>
              {(
                streams
                  .filter(s => s.sender.toLowerCase() === account.toLowerCase() && s.isActive)
                  .reduce((acc, s) => acc + s.deposit, 0) * 0.05
              ).toFixed(2)} USDT
            </span>
            <span className="metric-subtext highlight">5% APY in Mock Vault</span>
          </div>
        </div>
      )}

      {dashboardView === "recipient" && (
        <div className="dashboard-metrics">
          <div className="metric-card">
            <span className="metric-label">Total Incoming Revenue</span>
            <span className="metric-value">
              {streams
                .filter(s => s.sender.toLowerCase() !== account.toLowerCase())
                .reduce((acc, s) => acc + (s.isActive ? calculateAccrued(s) : s.withdrawn), 0)
                .toFixed(4)} USDT
            </span>
            <span className="metric-subtext">Received & Claimable</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Active Income Streams</span>
            <span className="metric-value" style={{ color: "var(--accent-cyan)" }}>
              {streams.filter(s => s.sender.toLowerCase() !== account.toLowerCase() && s.isActive).length}
            </span>
            <span className="metric-subtext highlight">Streaming in real-time</span>
          </div>
        </div>
      )}

      <div className="grid-layout">
        
        {/* Left Side: Realtime Ticker & Stream List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Ticking Counter */}
          {!currentActiveStream || !currentActiveStream.isActive ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', textAlign: 'center' }}>
              <Activity size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No Active Stream Selected</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '320px' }}>
                There are no active real-time streaming channels running on this wallet view. Select an active stream below or initialize a new one to monitor live yield.
              </p>
            </div>
          ) : (
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
                  {dashboardView === "creator" && (
                    <button 
                      className={`btn ${currentActiveStream.isPaused ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => toggleStreamPause(currentActiveStream.id)}
                      disabled={currentActiveStream.isDisputed}
                      title={currentActiveStream.isDisputed ? "Cannot manually resume a disputed stream. Use the DAO buttons below." : ""}
                    >
                      {currentActiveStream.isPaused ? <Play size={16} /> : <Pause size={16} />}
                      {currentActiveStream.isPaused ? "Resume" : "Pause"}
                    </button>
                  )}
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleWithdraw(currentActiveStream.id)}
                    disabled={tickerClaimable <= 0.01}
                  >
                    <RotateCcw size={16} />
                    Withdraw
                  </button>
                </div>
              </div>

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
                  <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Initial Locked Deposit
                    <span style={{ fontSize: '0.65rem', background: 'var(--accent-cyan)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 'bold' }}>DeFi Vault 5% APY</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)' }}>{currentActiveStream.deposit} USDT</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Streams Panel */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins size={20} className="text-cyan" />
              {dashboardView === "creator" ? "Your Outgoing Streams" : "Your Incoming Streams"}
            </h3>
            
            <div className="stream-list">
              {streams
                .filter(s => 
                  dashboardView === "creator" 
                    ? s.sender.toLowerCase() === account.toLowerCase() 
                    : s.sender.toLowerCase() !== account.toLowerCase()
                )
                .map(stream => (
                <div 
                  key={stream.id} 
                  className={`stream-card ${stream.id === activeStreamId ? 'active' : ''} ${stream.isPaused ? 'paused' : ''} ${!stream.isActive ? 'depleted' : ''}`}
                  onClick={() => stream.isActive && setActiveStreamId(stream.id)}
                  style={{ cursor: stream.isActive ? 'pointer' : 'default' }}
                >
                  <div className="stream-info">
                    <span className="stream-party">
                      {dashboardView === "creator" ? `Stream #${stream.id} to AI Agent` : `Stream #${stream.id} from Creator`}
                    </span>
                    <span className="stream-meta">
                      <span>Rate: <span className="stream-rate">{stream.ratePerSecond} USDT/sec</span></span>
                      <span>Withdrawn: {stream.withdrawn.toFixed(2)} / {stream.deposit} USDT</span>
                    </span>
                    {!stream.isActive && (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        CANCELLED / DEPLETED
                        <span style={{ background: '#8b5cf6', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '0.2rem', fontSize: '0.65rem' }}>🏆 NFT Receipt Minted</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="stream-action-group" onClick={e => e.stopPropagation()}>
                    {stream.isActive && !stream.isDisputed && dashboardView === "creator" && (
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
                        <button 
                          className="btn" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#ef4444', color: 'white', border: 'none' }}
                          onClick={() => handleDisputeStream(stream.id)}
                        >
                          Dispute
                        </button>
                      </>
                    )}
                    {stream.isActive && stream.isDisputed && dashboardView === "creator" && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#ef4444', color: 'white', border: 'none' }}
                          onClick={() => handleResolveDispute(stream.id, true)}
                        >
                          DAO Resolve (Refund)
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#10b981', color: 'white', border: 'none' }}
                          onClick={() => handleResolveDispute(stream.id, false)}
                        >
                          DAO Resolve (Resume)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Stream Panel */}
          {dashboardView === "creator" && (
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
                  {parseFloat(newStream.deposit) > parseFloat(usdtBalance) && (
                    <div style={{ color: 'var(--state-error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      Insufficient balance (You have {usdtBalance} USDT)
                    </div>
                  )}
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

              {/* Feature 1 UI: Revenue Splitting Breakdown */}
              <div style={{ marginTop: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--glass-bg)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>🤖 AI Provider (Receiver)</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>70%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>🛠️ Model Creator Wallet</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>20%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>🏛️ BOT DAO Treasury</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>10%</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading || parseFloat(newStream.deposit) > parseFloat(usdtBalance)}>
                <Zap size={16} />
                Open Stream
              </button>
            </form>
          </div>
          )}

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
                  {swapFrom === "BOT" && parseFloat(swapAmount) > parseFloat(botBalance) && (
                    <div style={{ color: 'var(--state-error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      Insufficient BOT balance
                    </div>
                  )}
                  {swapFrom === "USDT" && parseFloat(swapAmount) > parseFloat(usdtBalance) && (
                    <div style={{ color: 'var(--state-error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      Insufficient USDT balance
                    </div>
                  )}
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

              <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                Exchange Rate based on Testnet Liquidity Pool
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={
                loading || 
                !swapAmount || 
                (swapFrom === "BOT" && parseFloat(swapAmount) > parseFloat(botBalance)) ||
                (swapFrom === "USDT" && parseFloat(swapAmount) > parseFloat(usdtBalance))
              }>
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

              {/* Force Outage Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.8rem 0', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.4rem', border: '1px dashed var(--glass-border)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text)' }}>Simulate Provider Outage</span>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Forces Sentry to trigger auto-pause on BOT Chain</span>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                  <input 
                    type="checkbox" 
                    checked={forceOutage} 
                    onChange={handleToggleForceOutage}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: forceOutage ? 'var(--state-error)' : '#333', transition: '.3s', borderRadius: '20px' }}>
                    <span style={{ position: 'absolute', content: '""', height: '14px', width: '14px', left: forceOutage ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%' }}></span>
                  </span>
                </label>
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

      <footer className="landing-footer" style={{ marginTop: '4rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2.5rem' }}>
        <div className="footer-content">
          <div className="footer-brand-section">
            <div className="brand" onClick={() => setView("landing")} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
              <span className="brand-logo">🌊</span>
              <span className="brand-name" style={{ fontSize: '1.25rem' }}>Rheon</span>
            </div>
            <p className="footer-desc">
              AI-shielded real-time streaming payments and decentralized dispute resolution on BOT Chain.
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="X (Twitter)">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/mrnetwork0001/BOTflow" target="_blank" rel="noreferrer" aria-label="GitHub">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
            </div>
          </div>
          <div className="footer-links-container">
            <div className="footer-col">
              <h4>PROTOCOL</h4>
              <a href="#">Features</a>
              <a href="#">AI-Shield</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setView("app"); }}>Launch App</a>
            </div>
            <div className="footer-col">
              <h4>ECOSYSTEM</h4>
              <a href="#">BOT Chain Explorer</a>
              <a href="#">BOT Wallet</a>
              <a href="#">DAO Treasury</a>
              <a href="#">DeFi Yield Vaults</a>
            </div>
            <div className="footer-col">
              <h4>RESOURCES</h4>
              <a href="#">Docs</a>
              <a href="#">Contracts</a>
              <a href="#">BDEX Swap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
