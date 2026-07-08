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
  AlertTriangle,
  Award,
  Cpu,
  Terminal,
  Landmark,
  Copy,
  LogOut,
  Check,
  Menu,
  X
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
  "function daoContract() view returns (address)",
  "function yieldVault() view returns (address)",
  "function receiptNFT() view returns (address)"
];

const DAO_ABI = [
  "function vote(uint256 streamId, bool refundUser)",
  "function executeResolution(uint256 streamId)"
];

const YIELD_POOL_ABI = [
  "function totalDeposits() view returns (uint256)",
  "function totalBorrows() view returns (uint256)",
  "function priceOracle() view returns (address)",
  "function borrows(address) view returns (uint256 principal, uint256 collateral, uint256 borrowTime)",
  "function getDebt(address) view returns (uint256)",
  "function isLiquidatable(address) view returns (bool)",
  "function borrow(address token, uint256 amount) payable",
  "function repay(address token, uint256 amount)"
];

const ORACLE_ABI = [
  "function botPrice() view returns (uint256)"
];

const BDEX_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)"
];

const RheonFlowAnimation = () => {
  const canvasRef = useRef(null);
  const [localOutage, setLocalOutage] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth || (window.innerWidth - 32);
      canvas.height = 360;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
      constructor(startX, startY, endX, endY, speed, color) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.x = startX;
        this.y = startY;
        this.progress = Math.random();
        this.speed = speed;
        this.color = color;
        this.size = Math.random() * 2 + 2;
      }

      update(outage) {
        if (outage) {
          this.size = Math.max(0, this.size - 0.05);
          return;
        }
        this.progress += this.speed;
        if (this.progress >= 1) {
          this.progress = 0;
          this.x = this.startX;
          this.y = this.startY;
          this.size = Math.random() * 2 + 2;
        }
        
        const cp1x = this.startX + (this.endX - this.startX) * 0.25;
        const cp1y = this.startY - 60;
        const cp2x = this.startX + (this.endX - this.startX) * 0.75;
        const cp2y = this.endY + 60;

        const t = this.progress;
        this.x = (1 - t) ** 3 * this.startX + 
                 3 * (1 - t) ** 2 * t * cp1x + 
                 3 * (1 - t) * t ** 2 * cp2x + 
                 t ** 3 * this.endX;
        this.y = (1 - t) ** 3 * this.startY + 
                 3 * (1 - t) ** 2 * t * cp1y + 
                 3 * (1 - t) * t ** 2 * cp2y + 
                 t ** 3 * this.endY;
      }

      draw(c) {
        if (this.size <= 0) return;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.shadowColor = this.color;
        c.shadowBlur = 8;
        c.fill();
        c.shadowBlur = 0;
      }
    }

    const leftNode = { x: 50, y: 180 };
    const rightNode = { x: 400, y: 180 };
    const sentryNode = { x: 225, y: 180 };

    const particles = [];
    const colors = ['#00cc99', '#00ffcc', '#009973', '#ffffff'];
    
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle(
        leftNode.x, 
        leftNode.y, 
        rightNode.x, 
        rightNode.y, 
        Math.random() * 0.007 + 0.004, 
        colors[Math.floor(Math.random() * colors.length)]
      ));
    }

    let pulseRadius = 0;
    
    const drawCurvePath = (startX, startY, endX, endY, offset) => {
      ctx.beginPath();
      ctx.moveTo(startX, startY + offset);
      const cp1x = startX + (endX - startX) * 0.25;
      const cp1y = startY - 60 + offset;
      const cp2x = startX + (endX - startX) * 0.75;
      const cp2y = endY + 60 + offset;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY + offset);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      leftNode.x = canvas.width * 0.15;
      leftNode.y = canvas.height * 0.5;
      rightNode.x = canvas.width * 0.85;
      rightNode.y = canvas.height * 0.5;
      sentryNode.x = canvas.width * 0.5;
      sentryNode.y = canvas.height * 0.5;

      drawCurvePath(leftNode.x, leftNode.y, rightNode.x, rightNode.y, 0);
      drawCurvePath(leftNode.x, leftNode.y, rightNode.x, rightNode.y, -12);
      drawCurvePath(leftNode.x, leftNode.y, rightNode.x, rightNode.y, 12);

      particles.forEach(p => {
        p.startX = leftNode.x;
        p.startY = leftNode.y;
        p.endX = rightNode.x;
        p.endY = rightNode.y;
        p.update(localOutage);
        p.draw(ctx);
      });

      pulseRadius += 0.4;
      if (pulseRadius > 35) pulseRadius = 0;

      ctx.beginPath();
      ctx.arc(sentryNode.x, sentryNode.y, 20 + pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = localOutage ? `rgba(255, 59, 48, ${1 - pulseRadius / 35})` : `rgba(0, 204, 153, ${1 - pulseRadius / 35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sentryNode.x, sentryNode.y, 24, 0, Math.PI * 2);
      ctx.fillStyle = localOutage ? 'rgba(255, 59, 48, 0.2)' : 'rgba(0, 204, 153, 0.1)';
      ctx.strokeStyle = localOutage ? '#ff3b30' : '#00cc99';
      ctx.lineWidth = 2;
      ctx.shadowColor = localOutage ? '#ff3b30' : '#00cc99';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 8px "Space Grotesk", sans-serif';
      ctx.fillStyle = localOutage ? '#ff3b30' : '#00cc99';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(localOutage ? "OUTAGE" : "SENTRY", sentryNode.x, sentryNode.y);

      ctx.beginPath();
      ctx.arc(leftNode.x, leftNode.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0f1a';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.font = '8px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#9aa0b9';
      ctx.fillText("USER", leftNode.x, leftNode.y);

      ctx.beginPath();
      ctx.arc(rightNode.x, rightNode.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0f1a';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9aa0b9';
      ctx.fillText("AGENT", rightNode.x, rightNode.y);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [localOutage]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    const sentryX = canvas.width * 0.5;
    const sentryY = canvas.height * 0.5;
    const dist = Math.sqrt((clickX - sentryX) ** 2 + (clickY - sentryY) ** 2);
    if (dist < 30) {
      setLocalOutage(prev => !prev);
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      onClick={handleCanvasClick}
      style={{ 
        width: '100%', 
        height: '360px', 
        background: 'radial-gradient(circle at 50% 50%, rgba(13, 17, 30, 0.6) 0%, rgba(7, 8, 13, 0) 80%)',
        borderRadius: '1.5rem',
        border: '1px solid var(--glass-border)',
        cursor: 'pointer'
      }} 
    />
  );
};

function App() {
  const [view, setView] = useState("landing");
  const [dashboardView, setDashboardView] = useState("creator");
  const [activeDocTab, setActiveDocTab] = useState(0);
  // Web3 state
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("Not Connected");
  const [provider, setProvider] = useState(null);
  const [streamerAddr, setStreamerAddr] = useState(import.meta.env.VITE_STREAMER_CONTRACT_ADDRESS || "");
  const [usdtAddr, setUsdtAddr] = useState(import.meta.env.VITE_USDT_ADDRESS || "");
  const [bdexAddr, setBdexAddr] = useState(import.meta.env.VITE_BDEX_ROUTER_ADDRESS || "0xD6425a02f0845B8D99e349C34D2E7A576E177345");
  // Hardcoded for demo: assumes DAO deployed right after Streamer at a nearby nonce
  const [daoAddr, setDaoAddr] = useState("");
  const [vaultAddr, setVaultAddr] = useState("");
  const [receiptNftAddr, setReceiptNftAddr] = useState("");
  const [vaultBalance, setVaultBalance] = useState("0.00");
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
  const [selectedReceiptStream, setSelectedReceiptStream] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState([48, 52, 45, 50, 58, 62, 47, 50, 53, 49]);
  const [mockStats, setMockStats] = useState({
    users: 0,
    settled: 0,
    swap: 0,
    revenue: 0
  });

  // Real-time ticking counter states
  const [tickerAccrued, setTickerAccrued] = useState(0);
  const [tickerClaimable, setTickerClaimable] = useState(0);
  const [tickerYield, setTickerYield] = useState(0);
  
  // Wallet Loading states
  const [loading, setLoading] = useState(false);
  
  // Refs
  const tickerIntervalRef = useRef(null);

  // Wallet menu dropdown and copy states
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stream Detail Modal state & pagination
  const [selectedDetailStream, setSelectedDetailStream] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Yield & Lending Pool states
  const [poolDeposits, setPoolDeposits] = useState("0.00");
  const [poolBorrows, setPoolBorrows] = useState("0.00");
  const [botPrice, setBotPrice] = useState("1.00");
  const [userBorrow, setUserBorrow] = useState({
    principal: "0.00",
    collateral: "0.00",
    currentDebt: "0.00",
    healthFactor: "0"
  });
  const [borrowInput, setBorrowInput] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Transaction Status Modal state & helpers
  const [txModal, setTxModal] = useState({
    isOpen: false,
    title: "",
    status: "signing", // 'signing', 'pending', 'success', 'error'
    txHash: "",
    errorMsg: ""
  });

  const showTxStatus = (title, status, txHash = "", errorMsg = "") => {
    setTxModal({
      isOpen: true,
      title,
      status,
      txHash,
      errorMsg
    });
  };

  const closeTxModal = () => {
    setTxModal(prev => ({ ...prev, isOpen: false }));
  };
  const walletMenuRef = useRef(null);

  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target)) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Connect MetaMask and enforce BOT Chain Testnet
  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast("MetaMask is not installed. Please install it to use Rheon.", "error");
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
            showToast("Failed to add BOT Chain Testnet. Please add it manually.", "error");
            setLoading(false);
            return;
          }
        } else {
          console.error(switchError);
          showToast("You must switch to the BOT Chain Testnet to use Rheon.", "error");
          setLoading(false);
          return;
        }
      }

      // Ensure provider is refreshed after potential network switch
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const net = await web3Provider.getNetwork();
      
      if (net.chainId !== 968n && net.chainId !== 968 && Number(net.chainId) !== 968) {
        showToast("Please switch your wallet to BOT Chain Testnet (Chain ID 968) to proceed.", "error");
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
    setVaultAddr("");
    setVaultBalance("0.00");
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

      // Fetch yield vault details on-chain
      let currentVaultAddr = vaultAddr;
      if (!currentVaultAddr) {
        try {
          currentVaultAddr = await streamerContract.yieldVault();
          setVaultAddr(currentVaultAddr);
        } catch (err) {
          console.error("Failed to fetch yield vault address:", err);
        }
      }

      let currentReceiptNftAddr = receiptNftAddr;
      if (!currentReceiptNftAddr) {
        try {
          currentReceiptNftAddr = await streamerContract.receiptNFT();
          setReceiptNftAddr(currentReceiptNftAddr);
        } catch (err) {
          console.error("Failed to fetch receipt NFT address:", err);
        }
      }
      if (currentVaultAddr) {
        try {
          const poolContract = new ethers.Contract(currentVaultAddr, YIELD_POOL_ABI, provider);
          
          // Query pool deposits & borrows
          const totalDep = await poolContract.totalDeposits();
          const totalBor = await poolContract.totalBorrows();
          
          setPoolDeposits(parseFloat(ethers.formatUnits(totalDep, 6)).toFixed(2));
          setPoolBorrows(parseFloat(ethers.formatUnits(totalBor, 6)).toFixed(2));
          setVaultBalance(parseFloat(ethers.formatUnits(totalDep, 6)).toFixed(2)); // Backwards compatibility
          
          // Query price oracle price
          const oracleAddr = await poolContract.priceOracle();
          const oracleContract = new ethers.Contract(oracleAddr, ORACLE_ABI, provider);
          const price = await oracleContract.botPrice();
          const priceFormatted = (parseFloat(price) / 1000000).toFixed(2);
          setBotPrice(priceFormatted);

          // Query user borrow receipt
          const receipt = await poolContract.borrows(account);
          const principalVal = parseFloat(ethers.formatUnits(receipt.principal, 6));
          if (principalVal > 0) {
            const debt = await poolContract.getDebt(account);
            const collateralVal = parseFloat(ethers.formatEther(receipt.collateral));
            const debtVal = parseFloat(ethers.formatUnits(debt, 6));
            
            // Health Factor = (collateralVal * botPrice) / debtVal * 100
            const collateralUsdt = collateralVal * parseFloat(priceFormatted);
            const health = debtVal > 0 ? ((collateralUsdt / debtVal) * 100).toFixed(0) : "0";

            setUserBorrow({
              principal: principalVal.toFixed(2),
              collateral: collateralVal.toFixed(4),
              currentDebt: debtVal.toFixed(4),
              healthFactor: health
            });
          } else {
            setUserBorrow({
              principal: "0.00",
              collateral: "0.00",
              currentDebt: "0.00",
              healthFactor: "0"
            });
          }
        } catch (err) {
          console.error("Failed to fetch lending pool stats:", err);
        }
      }
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
      showToast("Failed to connect to Sentry Node. Is it running on port 4000?", "error");
    }
  };

  const handleViewReceipt = (stream) => {
    setSelectedReceiptStream(stream);
    setShowReceiptModal(true);
  };

  const fetchGlobalStats = async () => {
    try {
      const activeStreamer = streamerAddr || "0x1E23d18CFc12c219E7CFA40Db4f1a7bA90a124B9";
      const tempProvider = new ethers.JsonRpcProvider(import.meta.env.VITE_BOTCHAIN_RPC_URL || "https://rpc.bohr.life");
      const streamerContract = new ethers.Contract(activeStreamer, STREAMER_ABI, tempProvider);
      
      const nextId = await streamerContract.nextStreamId();
      const totalStreams = Number(nextId) - 1;
      
      let totalSettled = 0;
      const uniqueUsers = new Set();
      
      const promises = [];
      for (let i = 1; i <= totalStreams; i++) {
        promises.push(streamerContract.getStream(i));
      }
      const results = await Promise.all(promises);
      
      for (let i = 0; i < results.length; i++) {
        const s = results[i];
        if (s.isActive || s.withdrawnAmount > 0n) {
          totalSettled += parseFloat(ethers.formatUnits(s.withdrawnAmount, 6));
          uniqueUsers.add(s.sender.toLowerCase());
          for (const r of s.receivers) {
            uniqueUsers.add(r.toLowerCase());
          }
        }
      }
      
      // Load user's local swaps from localStorage
      const localSwapVol = parseFloat(localStorage.getItem("rheon_local_swap_vol") || "0");
      const localSwapUsers = JSON.parse(localStorage.getItem("rheon_local_swap_users") || "[]");
      
      for (const u of localSwapUsers) {
        uniqueUsers.add(u.toLowerCase());
      }

      // Query actual Bohr DEX pair swap events
      let onchainSwapVolume = 0;
      try {
        const routerAddress = bdexAddr || "0xD6425a02f0845B8D99e349C34D2E7A576E177345";
        const routerContract = new ethers.Contract(routerAddress, ["function factory() view returns (address)"], tempProvider);
        const factoryAddr = await routerContract.factory();
        const factoryContract = new ethers.Contract(factoryAddr, ["function getPair(address, address) view returns (address)"], tempProvider);
        const WBOT = "0xD5452816194a3784dBa983426cCe7c122F4abd30";
        const USDT = usdtAddr || "0xa00D072A5A060f48Aa2aF79700a1FaA4140141c6";
        const pairAddr = await factoryContract.getPair(WBOT, USDT);
        
        if (pairAddr && pairAddr !== ethers.ZeroAddress) {
          const pairContract = new ethers.Contract(pairAddr, [
            "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
          ], tempProvider);
          
          const latestBlock = await tempProvider.getBlockNumber();
          // Query from block 1 to catch all historical swaps on testnet
          const fromBlock = 1;
          const filter = pairContract.filters.Swap();
          const logs = await pairContract.queryFilter(filter, fromBlock, "latest");
          
          const isUSDTToken0 = USDT.toLowerCase() < WBOT.toLowerCase();
          let totalUSDT = 0n;
          
          for (const log of logs) {
            const { amount0In, amount1In, amount0Out, amount1Out } = log.args;
            if (isUSDTToken0) {
              totalUSDT += amount0In + amount0Out;
            } else {
              totalUSDT += amount1In + amount1Out;
            }
          }
          
          onchainSwapVolume = parseFloat(ethers.formatUnits(totalUSDT, 6));
        }
      } catch (err) {
        console.error("Failed to fetch Bohr DEX swap volume:", err);
      }
      
      const finalUsers = uniqueUsers.size;
      const finalSettled = totalSettled;
      const finalSwap = onchainSwapVolume;
      const finalRevenue = finalSettled * 0.005;
      
      setMockStats({
        users: finalUsers,
        settled: finalSettled,
        swap: finalSwap,
        revenue: finalRevenue
      });
    } catch (e) {
      console.error("Failed to load global stats:", e);
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

  useEffect(() => {
    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [streamerAddr]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyHistory(prev => {
        let nextVal;
        if (sentryStatus === "OUTAGE") {
          // Shoot up if outage is triggered
          nextVal = Math.floor(Math.random() * 500) + 2500;
        } else {
          // Normal latency fluctuation
          nextVal = Math.floor(Math.random() * 20) + 45;
        }
        return [...prev.slice(1), nextVal];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [sentryStatus]);





  // Create stream implementation
  const handleCreateStream = async (e) => {
    e.preventDefault();
    const depVal = parseFloat(newStream.deposit);
    const rateVal = parseFloat(newStream.rate);

    if (isNaN(depVal) || isNaN(rateVal) || depVal <= 0 || rateVal <= 0) {
      showToast("Invalid deposit or stream rate", "error");
      return;
    }

    if (depVal > parseFloat(usdtBalance)) {
      showToast("Insufficient USDT balance. You must have at least the initial deposit amount in your wallet.", "error");
      return;
    }

    // Live Web3
    if (!provider) return;
    try {
      setLoading(true);
      showTxStatus("Create Stream", "signing");
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      const tokenContract = new ethers.Contract(usdtAddr, ERC20_ABI, signer);
      
      // Approve
      const amountWei = ethers.parseUnits(newStream.deposit, 6);
      addSentryLog("INFO", "Approving USDT for streaming...");
      const appTx = await tokenContract.approve(streamerAddr, amountWei);
      showTxStatus("USDT Approval", "pending", appTx.hash);
      await appTx.wait();
      
      addSentryLog("INFO", "Approval confirmed. Creating stream...");
      showTxStatus("Create Stream", "signing");

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
      showTxStatus("Create Stream", "pending", tx.hash);
      const receipt = await tx.wait();
      addSentryLog("INFO", `Stream successfully created in block ${receipt.blockNumber}!`);
      showTxStatus("Create Stream", "success", tx.hash);
      
      // Sync real-time data from blockchain instead of local mock state
      await fetchRealtimeData();
      await fetchGlobalStats();
       
      // Find the newest stream to set as active
      const nextId = await streamerContract.nextStreamId();
      setActiveStreamId(Number(nextId) - 1);
    } catch (error) {
      console.error(error);
      addSentryLog("ERROR", `Failed to create stream: ${error.message}`);
      showTxStatus("Create Stream", "error", "", error.message);
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
      showToast("Insufficient BOT balance for this swap.", "error");
      return;
    }
    if (swapFrom === "USDT" && amount > parseFloat(usdtBalance)) {
      showToast("Insufficient USDT balance for this swap.", "error");
      return;
    }

    if (!provider) return;
    try {
      setLoading(true);
      showTxStatus("Swap Tokens", "signing");
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
        showTxStatus("Swap BOT for USDT", "pending", tx.hash);
        await tx.wait();
        showTxStatus("Swap BOT for USDT", "success", tx.hash);
        addSentryLog("INFO", "BOT to USDT Swap completed successfully.");
      } else {
        addSentryLog("INFO", `Swapping ${amount} USDT to BOT...`);
        const tokenContract = new ethers.Contract(usdtAddr, ERC20_ABI, signer);
        const usdtWei = ethers.parseUnits(swapAmount, 6); // Assuming 6 decimals for USDT
        const path = [USDT, WBOT];
        
        // Approve BDEX Router
        addSentryLog("INFO", "Approving USDT for swap...");
        const appTx = await tokenContract.approve(bdexAddr, usdtWei);
        showTxStatus("USDT Approval", "pending", appTx.hash);
        await appTx.wait();
        
        showTxStatus("Swap USDT for BOT", "signing");
        const tx = await bdexContract.swapExactTokensForETH(
          usdtWei,
          0, // amountOutMin
          path,
          account,
          deadline
        );
        showTxStatus("Swap USDT for BOT", "pending", tx.hash);
        await tx.wait();
        showTxStatus("Swap USDT for BOT", "success", tx.hash);
        addSentryLog("INFO", "USDT to BOT Swap completed successfully.");
      }
      // Log local swap stats to localStorage
      try {
        const localSwapVol = parseFloat(localStorage.getItem("rheon_local_swap_vol") || "0");
        const newVol = localSwapVol + amount;
        localStorage.setItem("rheon_local_swap_vol", newVol.toString());
        
        const localSwapUsers = JSON.parse(localStorage.getItem("rheon_local_swap_users") || "[]");
        if (!localSwapUsers.includes(account)) {
          localSwapUsers.push(account);
          localStorage.setItem("rheon_local_swap_users", JSON.stringify(localSwapUsers));
        }
      } catch (err) {
        console.error("Local storage update failed", err);
      }
      
      setSwapAmount("");
      setSwapEstimated("");
      await updateBalances(account, provider);
      await fetchGlobalStats();
    } catch (error) {
      console.error(error);
      addSentryLog("ERROR", `Swap failed: ${error.message}`);
      showTxStatus("Swap Tokens", "error", "", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Execute Borrow USDT
  const handleBorrow = async (e) => {
    e.preventDefault();
    const amount = parseFloat(borrowInput);
    if (isNaN(amount) || amount <= 0) return;

    if (!provider || !vaultAddr) return;
    try {
      setLoading(true);
      showTxStatus("Borrow USDT", "signing");
      const signer = await provider.getSigner();
      const poolContract = new ethers.Contract(vaultAddr, YIELD_POOL_ABI, signer);

      // Estimate required BOT collateral
      // requiredCollateralUsdt = amount * 1.5
      // requiredCollateralBot = requiredCollateralUsdt / botPrice
      const collateralVal = (amount * 1.5) / parseFloat(botPrice);
      const collateralWei = ethers.parseEther(collateralVal.toFixed(18));
      const usdtWei = ethers.parseUnits(borrowInput, 6);
      
      console.log(`Borrowing ${amount} USDT with ${collateralVal} BOT collateral...`);
      const tx = await poolContract.borrow(usdtAddr, usdtWei, { value: collateralWei });
      showTxStatus("Borrow USDT", "pending", tx.hash);
      await tx.wait();
      showTxStatus("Borrow USDT", "success", tx.hash);
      
      setBorrowInput("");
      await fetchRealtimeData();
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Borrow failed: ${err.message}`);
      showTxStatus("Borrow USDT", "error", "", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Execute Repay Borrow
  const handleRepay = async (e) => {
    e.preventDefault();
    if (!provider || !vaultAddr) return;
    try {
      setLoading(true);
      showTxStatus("Repay Loan", "signing");
      const signer = await provider.getSigner();
      const poolContract = new ethers.Contract(vaultAddr, YIELD_POOL_ABI, signer);
      const tokenContract = new ethers.Contract(usdtAddr, ERC20_ABI, signer);

      const debt = await poolContract.getDebt(account);
      
      // Approve USDT spending
      addSentryLog("INFO", "Approving USDT for loan repayment...");
      const appTx = await tokenContract.approve(vaultAddr, debt);
      showTxStatus("USDT Approval", "pending", appTx.hash);
      await appTx.wait();

      showTxStatus("Repay Loan", "signing");
      const tx = await poolContract.repay(usdtAddr, debt);
      showTxStatus("Repay Loan", "pending", tx.hash);
      await tx.wait();
      showTxStatus("Repay Loan", "success", tx.hash);
      
      await fetchRealtimeData();
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Repayment failed: ${err.message}`);
      showTxStatus("Repay Loan", "error", "", err.message);
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
      
      showTxStatus(str.isPaused ? "Resume Stream" : "Pause Stream", "signing");
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      if (str.isPaused) {
        addSentryLog("INFO", `Resuming stream ${id}...`);
        const tx = await streamerContract.resumeStream(id);
        showTxStatus("Resume Stream", "pending", tx.hash);
        await tx.wait();
        showTxStatus("Resume Stream", "success", tx.hash);
        addSentryLog("INFO", `Stream ${id} resumed.`);
      } else {
        addSentryLog("INFO", `Pausing stream ${id}...`);
        const tx = await streamerContract.pauseStream(id);
        showTxStatus("Pause Stream", "pending", tx.hash);
        await tx.wait();
        showTxStatus("Pause Stream", "success", tx.hash);
        addSentryLog("INFO", `Stream ${id} paused.`);
      }
      await updateBalances(account, provider);
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to toggle pause: ${err.message}`);
      showTxStatus("Toggle Pause", "error", "", err.message);
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
        showToast("Nothing accrued to withdraw yet", "warning");
        return;
      }
      
      showTxStatus("Withdraw Yield", "signing");
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      addSentryLog("INFO", `Withdrawing from stream ${id}...`);
      const claimableWei = ethers.parseUnits(claimable.toFixed(6), 6);
      const tx = await streamerContract.withdrawFromStream(id, claimableWei);
      showTxStatus("Withdraw Yield", "pending", tx.hash);
      await tx.wait();
      showTxStatus("Withdraw Yield", "success", tx.hash);
      addSentryLog("ACTION", `Withdrawn ${claimable.toFixed(4)} USDT from Stream ${id}`);
      
      await updateBalances(account, provider);
      await fetchGlobalStats();
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to withdraw: ${err.message}`);
      showTxStatus("Withdraw Yield", "error", "", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Stream
  const handleCancelStream = async (id) => {
    if (!provider) return;
    try {
      setLoading(true);
      showTxStatus("Cancel Stream & Mint NFT", "signing");
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      addSentryLog("INFO", `Cancelling stream ${id}...`);
      const tx = await streamerContract.cancelStream(id);
      showTxStatus("Cancel Stream & Mint NFT", "pending", tx.hash);
      await tx.wait();
      showTxStatus("Cancel Stream & Mint NFT", "success", tx.hash);
      addSentryLog("INFO", `Stream ${id} cancelled and NFT Receipt Minted!`);
      
      setStreams(streams.map(s => s.id === id ? { ...s, isActive: false } : s));
      await updateBalances(account, provider);
      await fetchGlobalStats();
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to cancel: ${err.message}`);
      showTxStatus("Cancel Stream", "error", "", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Feature 4: Dispute Stream
  const handleDisputeStream = async (id) => {
    if (!provider) return;
    try {
      setLoading(true);
      showTxStatus("Open Dispute", "signing");
      const signer = await provider.getSigner();
      const streamerContract = new ethers.Contract(streamerAddr, STREAMER_ABI, signer);
      
      addSentryLog("INFO", `Opening dispute for stream ${id}...`);
      const tx = await streamerContract.disputeStream(id);
      showTxStatus("Open Dispute", "pending", tx.hash);
      await tx.wait();
      showTxStatus("Open Dispute", "success", tx.hash);
      addSentryLog("INFO", `Stream ${id} disputed and frozen.`);
      
      setStreams(streams.map(s => s.id === id ? { ...s, isPaused: true, isDisputed: true } : s));
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `Failed to dispute: ${err.message}`);
      showTxStatus("Open Dispute", "error", "", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Feature 4: DAO Resolve Dispute
  const handleResolveDispute = async (id, refundUser) => {
    if (!provider) return;
    
    showTxStatus("Resolve Dispute", "signing");
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
      showTxStatus("Resolve Dispute", "error", "", "Failed to resolve DAO contract address.");
      return;
    }

    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const daoContract = new ethers.Contract(currentDaoAddr, DAO_ABI, signer);
      
      addSentryLog("INFO", `Submitting DAO Vote: ${refundUser ? 'REFUND' : 'RESUME'}...`);
      const txVote = await daoContract.vote(id, refundUser);
      showTxStatus("DAO Vote", "pending", txVote.hash);
      await txVote.wait();
      
      addSentryLog("INFO", `Vote registered. Executing resolution on-chain...`);
      showTxStatus("Execute DAO Resolution", "signing");
      const txExec = await daoContract.executeResolution(id);
      showTxStatus("Execute DAO Resolution", "pending", txExec.hash);
      await txExec.wait();
      showTxStatus("DAO Resolution", "success", txExec.hash);
      
      addSentryLog("INFO", `DAO Resolution executed! Dispute resolved on-chain.`);
      await fetchRealtimeData();
    } catch (err) {
      console.error(err);
      addSentryLog("ERROR", `DAO Resolution failed: ${err.reason || err.message}`);
      showTxStatus("Resolve Dispute", "error", "", err.reason || err.message);
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
      
      const elapsedSec = Math.max(0, (Date.now() - activeStr.startTime) / 1000);
      // Yield at 5% APY on the deposit balance
      const vaultYield = activeStr.deposit * 0.05 * (elapsedSec / 31536000);
      setTickerYield(vaultYield);
      
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
            <img src="/rheon_logo.png" alt="Rheon Logo" className="brand-logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '8px' }} />
            <div>
              <h2 className="brand-name" style={{ fontSize: '1.5rem' }}>Rheon</h2>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', display: 'block' }}>AI-SHIELDED PAYFI</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-glow"></div>
          <div className="hero-container">
            <div className="hero-content-left">
              <h1 className="hero-title">Autonomous PayFi for the Agentic Economy</h1>
              <p className="hero-subtitle">
                Rheon is the real-time value streaming protocol engineered for autonomous AI agents. Stream micro-payments with sub-second finality, automate multi-party splits, and generate non-custodial yield on idle deposits.
              </p>
              <div className="hero-buttons">
                <button className="btn btn-primary btn-lg" onClick={() => setView("app")}>
                  Launch Console
                </button>
                <a href="https://github.com/mrnetwork0001/BOTflow" target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
                  Explore Codebase
                </a>
              </div>
            </div>
            <div className="hero-media-right" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <RheonFlowAnimation />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', textAlign: 'center', display: 'block' }}>
                💡 Click the central SENTRY node inside the canvas to simulate an outage
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-val">{mockStats.users}</span>
              <span className="stat-lbl">Active Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">${mockStats.settled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="stat-lbl">Settled Volume</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">${mockStats.swap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="stat-lbl">Swap Volume (DEX)</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">${mockStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="stat-lbl">App Revenue (0.5%)</span>
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

        {/* Architecture & Flow Mechanics Documentation */}
        <section className="workflow-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '5rem', marginTop: '3rem' }}>
          <div className="section-header">
            <h2 className="section-title">Protocol Architecture & Real-World Flow</h2>
            <p className="section-subtitle" style={{ maxWidth: '700px' }}>
              Rheon connects human users, AI providers, and developers using automated PayFi micro-streams. Here is how the economics and architecture coordinate in real-time.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>01 / Core Stream Mechanics</div>
              <h4 style={{ color: '#fff', fontSize: '1.2rem' }}>70/20/10 Automatic Splits</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                When you stream USDT to an AI Agent, payments are divided every second on-chain: 
                <strong style={{ color: '#fff' }}> 70% </strong> goes to the server host (AI Provider) for compute power, 
                <strong style={{ color: '#fff' }}> 20% </strong> goes to the model developer as automated royalties, and 
                <strong style={{ color: '#fff' }}> 10% </strong> accumulates in the Rheon DAO Treasury.
              </p>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>02 / Outage Protection</div>
              <h4 style={{ color: '#fff', fontSize: '1.2rem' }}>VPS Sentry Nodes</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                To prevent paying for dead compute, users host a Sentry Node (watcher script) on their VPS. It constantly pings the AI agent. If the server drops offline, the Sentry pauses your payment stream on-chain instantly, protecting your funds.
              </p>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>03 / Real-World Integration</div>
              <h4 style={{ color: '#fff', fontSize: '1.2rem' }}>Pay-As-You-Use PayFi</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Perfect for <strong style={{ color: '#fff' }}>Autonomous Coding Agents</strong> (pay strictly while writing code), <strong style={{ color: '#fff' }}>DePIN GPU Rendering</strong> (pay per frame rendered), and <strong style={{ color: '#fff' }}>AI APIs</strong> (pay per query, eliminating flat-rate monthly subscriptions).
              </p>
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
            </button>
          </div>
        </div>

        <footer className="landing-footer">
          <div className="footer-content">
            <div className="footer-brand-section">
              <div className="brand" onClick={() => setView("landing")} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                <img src="/rheon_logo.png" alt="Rheon Logo" className="brand-logo" style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '6px' }} />
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
          <img src="/rheon_logo.png" alt="Rheon Logo" className="brand-logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '8px' }} />
          <div>
            <h1 className="brand-name">Rheon</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>AI-SHIELDED PAYFI HUB</span>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="mobile-hamburger-btn" 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Toggle Menu"
        >
          {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-actions-container ${showMobileMenu ? 'mobile-open' : ''}`}>
          <div className="network-badge">
            <span className="network-dot"></span>
            {network}
          </div>
          {!account ? (
            <button className="btn btn-connect" onClick={() => { connectWallet(); setShowMobileMenu(false); }} disabled={loading}>
              Connect BOT Wallet
            </button>
          ) : (
            <div className="wallet-container" ref={walletMenuRef}>
              <button className="btn btn-secondary" onClick={() => setShowWalletMenu(!showWalletMenu)}>
                {truncateAddress(account)}
              </button>
              {showWalletMenu && (
                <div className="wallet-dropdown">
                  <button className="wallet-dropdown-item" onClick={handleCopyAddress}>
                    {copied ? <Check size={14} style={{ color: 'var(--state-success)' }} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy Address"}
                  </button>
                  <button className="wallet-dropdown-item disconnect" onClick={() => { disconnectWallet(); setShowWalletMenu(false); setShowMobileMenu(false); }}>
                    <LogOut size={14} />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
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
          <button 
            className={dashboardView === "docs" ? "active" : ""} 
            onClick={() => setDashboardView("docs")}
          >
            Docs
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
            <span className="metric-label">DeFi Vault TVL (On-Chain)</span>
            <span className="metric-value" style={{ color: "var(--accent-cyan)" }}>
              {vaultBalance} USDT
            </span>
            <span className="metric-subtext">
              {vaultAddr ? (
                <a 
                  href={`https://scan.bohr.life/address/${vaultAddr}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="highlight"
                  style={{ textDecoration: 'underline' }}
                >
                  Vault Address: {vaultAddr.substring(0, 6)}...{vaultAddr.substring(vaultAddr.length - 4)}
                </a>
              ) : (
                "Loading Vault Address..."
              )}
            </span>
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

      {dashboardView !== "docs" && (
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

              <div className="details-grid" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Sender</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{currentActiveStream.sender}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Receiver (AI Agent/Provider)</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{currentActiveStream.receiver}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Flow Rate</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-cyan)' }}>{currentActiveStream.ratePerSecond} USDT/sec</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Locked Balance in Vault (On-Chain)
                    <span style={{ fontSize: '0.65rem', background: 'var(--accent-cyan)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 'bold' }}>DeFi Vault Active</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)' }}>{currentActiveStream.remainingBalance} USDT</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Vault Yield Accrued (5% APY Target)</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--state-success)', fontWeight: 'bold' }}>
                    +{tickerYield.toFixed(8)} USDT
                  </span>
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
              {(() => {
                const filtered = streams.filter(s => 
                  dashboardView === "creator" 
                    ? s.sender.toLowerCase() === account.toLowerCase() 
                    : s.sender.toLowerCase() !== account.toLowerCase()
                );
                
                if (dashboardView === "creator") {
                  const itemsPerPage = 5;
                  const totalPages = Math.ceil(filtered.length / itemsPerPage);
                  const startIndex = (outgoingPage - 1) * itemsPerPage;
                  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
                  
                  return (
                    <>
                      {paginated.map(stream => (
                        <div 
                          key={stream.id} 
                          className={`stream-card ${stream.id === activeStreamId ? 'active' : ''} ${stream.isPaused ? 'paused' : ''} ${!stream.isActive ? 'depleted' : ''}`}
                          onClick={() => {
                            setSelectedDetailStream(stream);
                            setShowDetailModal(true);
                            if (stream.isActive) {
                              setActiveStreamId(stream.id);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="stream-info">
                            <span className="stream-party">
                              Stream #{stream.id} to AI Agent
                            </span>
                            <span className="stream-meta">
                              <span>Rate: <span className="stream-rate">{stream.ratePerSecond} USDT/sec</span></span>
                              <span>Withdrawn: {stream.withdrawn.toFixed(2)} / {stream.deposit} USDT</span>
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            disabled={outgoingPage === 1}
                            onClick={() => setOutgoingPage(prev => Math.max(prev - 1, 1))}
                          >
                            Previous
                          </button>
                          <span style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Page {outgoingPage} of {totalPages}
                          </span>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            disabled={outgoingPage === totalPages}
                            onClick={() => setOutgoingPage(prev => Math.min(prev + 1, totalPages))}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  );
                } else {
                  return filtered.map(stream => (
                    <div 
                      key={stream.id} 
                      className={`stream-card ${stream.id === activeStreamId ? 'active' : ''} ${stream.isPaused ? 'paused' : ''} ${!stream.isActive ? 'depleted' : ''}`}
                      onClick={() => stream.isActive && setActiveStreamId(stream.id)}
                      style={{ cursor: stream.isActive ? 'pointer' : 'default' }}
                    >
                      <div className="stream-info">
                        <span className="stream-party">
                          Stream #{stream.id} {dashboardView === "creator" ? "to Agent" : "from Creator"}
                        </span>
                        <span className="stream-meta">
                          <span>Rate: <span className="stream-rate">{stream.ratePerSecond} USDT/sec</span></span>
                          <span>Withdrawn: {stream.withdrawn.toFixed(2)} / {stream.deposit} USDT</span>
                          <span>Started: <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>{new Date(stream.startTime).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></span>
                        </span>
                        {!stream.isActive && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              CANCELLED / DEPLETED
                              <span style={{ background: '#8b5cf6', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '0.2rem', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Award size={10} /> NFT Receipt Minted
                              </span>
                            </span>
                            <button 
                              className="btn" 
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', alignSelf: 'flex-start', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', color: '#c084fc', cursor: 'pointer' }}
                              onClick={() => handleViewReceipt(stream)}
                            >
                              View Receipt NFT
                            </button>
                          </div>
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
                  ));
                }
              })()}
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

              <div className="form-row-grid">
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Cpu size={14} style={{ color: 'var(--accent-purple)' }} /> AI Provider (Receiver)
                  </span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>70%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Terminal size={14} style={{ color: 'var(--accent-cyan)' }} /> Model Creator Wallet
                  </span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>20%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Landmark size={14} style={{ color: 'var(--state-success)' }} /> Rheon DAO Treasury
                  </span>
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

          {/* Rheon Yield & Lending Pool Console */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Landmark size={20} className="text-cyan" />
              Rheon Yield & Lending Pool
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Locked deposits generate interest dynamically. Lock native <strong>$BOT</strong> to borrow <strong>$USDT</strong> at a fixed 10% APR with 150% collateral coverage.
            </p>

            {/* Pool Statistics */}
            <div className="form-row-grid" style={{ marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', display: 'block' }}>TOTAL DEPOSITS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{poolDeposits} USDT</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', display: 'block' }}>TOTAL BORROWS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-pink)' }}>{poolBorrows} USDT</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', display: 'block' }}>UTILIZATION RATE</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>
                  {((parseFloat(poolBorrows) / (parseFloat(poolDeposits) || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', display: 'block' }}>BOT ORACLE PRICE</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--state-success)' }}>${botPrice}</span>
              </div>
            </div>

            {parseFloat(userBorrow.principal) === 0 ? (
              /* Borrow Form */
              <form onSubmit={handleBorrow}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Amount to Borrow</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Max Liquidity: {(parseFloat(poolDeposits) - parseFloat(poolBorrows)).toFixed(2)} USDT</span>
                  </label>
                  <div className="input-container">
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="0.00"
                      value={borrowInput}
                      onChange={e => setBorrowInput(e.target.value)}
                      required
                    />
                    <span className="input-suffix">USDT</span>
                  </div>
                </div>

                {borrowInput && parseFloat(borrowInput) > 0 && (
                  <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.15)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Required Collateral:</span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>
                        {((parseFloat(borrowInput) * 1.5) / parseFloat(botPrice)).toFixed(4)} BOT
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Interest Rate:</span>
                      <strong>10.0% APR</strong>
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={loading || !borrowInput || (parseFloat(borrowInput) > (parseFloat(poolDeposits) - parseFloat(poolBorrows)))}
                >
                  <Zap size={16} />
                  Borrow USDT
                </button>
              </form>
            ) : (
              /* Active Borrow Info & Repay */
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                  Your Active Loan
                </h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Borrowed Principal:</span>
                  <span style={{ color: '#fff', fontFamily: 'var(--font-family-mono)' }}>{userBorrow.principal} USDT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Current Total Debt (+Int):</span>
                  <span style={{ color: 'var(--accent-pink)', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>{userBorrow.currentDebt} USDT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Locked Collateral:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-family-mono)' }}>{userBorrow.collateral} BOT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Collateral Health:</span>
                  <span className={`sentry-health-tag ${parseInt(userBorrow.healthFactor) > 130 ? 'healthy' : 'outage'}`} style={{ fontSize: '0.75rem' }}>
                    {userBorrow.healthFactor}%
                  </span>
                </div>

                {parseInt(userBorrow.healthFactor) <= 125 && (
                  <div style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--state-error)', marginBottom: '1rem', lineHeight: '1.3' }}>
                    ⚠️ <strong>Warning:</strong> Collateral value is close to the 120% liquidation threshold. Repay immediately to avoid losing your BOT tokens.
                  </div>
                )}

                <button 
                  onClick={handleRepay} 
                  className="btn btn-danger" 
                  style={{ width: '100%' }}
                  disabled={loading || parseFloat(usdtBalance) < parseFloat(userBorrow.currentDebt)}
                >
                  Repay Loan & Unlock Collateral
                </button>
              </div>
            )}
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
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{sentryAddress}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <div className={`sentry-health-tag ${sentryStatus.toLowerCase()}`}>
                    <span className="network-dot" style={{ backgroundColor: sentryStatus === "HEALTHY" ? 'var(--state-success)' : sentryStatus === "OUTAGE" ? 'var(--state-error)' : 'var(--state-warning)' }}></span>
                    {sentryStatus}
                  </div>
                  {/* Micro Sparkline */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      Latency: {latencyHistory[latencyHistory.length - 1]}ms
                    </span>
                    <svg width="60" height="15" style={{ overflow: 'visible' }}>
                      <polyline
                        fill="none"
                        stroke={sentryStatus === "HEALTHY" ? 'var(--state-success)' : 'var(--state-error)'}
                        strokeWidth="1.5"
                        points={latencyHistory.map((val, i) => {
                          const x = i * (60 / (latencyHistory.length - 1));
                          const maxMapped = sentryStatus === "HEALTHY" ? 150 : 3000;
                          const y = 15 - Math.min((val / maxMapped) * 15, 15);
                          return `${x},${y}`;
                        }).join(" ")}
                      />
                    </svg>
                  </div>
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
      )}

      {dashboardView === "docs" && (
        <div className="docs-container" style={{ animation: 'fadeInSlideUp 0.3s ease-out' }}>
          {/* Sidebar */}
          <div className="glass-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.25rem', paddingLeft: '0.5rem', fontWeight: 'bold' }}>Rheon Documentation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                "1. Protocol Overview",
                "2. System Architecture",
                "3. Lending & Yield Pool",
                "4. AI Sentry Node Mechanics",
                "5. Developer Stack"
              ].map((title, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveDocTab(idx)}
                  style={{
                    textAlign: 'left',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid ' + (activeDocTab === idx ? 'var(--accent-cyan)' : 'transparent'),
                    background: activeDocTab === idx ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                    color: activeDocTab === idx ? 'var(--accent-cyan)' : 'var(--color-text-secondary)',
                    fontWeight: activeDocTab === idx ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={e => {
                    if (activeDocTab !== idx) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeDocTab !== idx) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '500px' }}>
            <div>
              {activeDocTab === 0 && (
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem', background: 'linear-gradient(90deg, #fff 0%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>1. Protocol Overview</h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Rheon is a real-time, trustless <strong>Pay-Per-Second streaming payment protocol</strong> designed for the machine-to-machine Web3 Knowledge Economy. 
                    Built on the high-speed <strong>BOHR Chain EVM L1</strong>, Rheon enables users to pay AI agents and computational models for services continuously per-second, with built-in financial protections and autonomous dispute resolution.
                  </p>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Instead of prepaying for services or risking credential leakage, Rheon secures computational value inside escrow vaults, routing claims dynamically. 
                    Furthermore, locked deposits generate real-time DeFi yield, ensuring high capital efficiency for all participants.
                  </p>
                  <div style={{ background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '12px', padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Zap size={20} style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(0 0 8px var(--accent-cyan))', flexShrink: 0 }} />
                    <span><strong>Core Principle:</strong> Pay only for the exact seconds of compute work rendered. If a service goes offline, the stream pauses instantly.</span>
                  </div>
                </div>
              )}

              {activeDocTab === 1 && (
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem', background: 'linear-gradient(90deg, #fff 0%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>2. System Architecture</h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Rheon uses smart contracts to govern the streaming lifecycle: creation, pausing, withdrawals, and cancellation. When a stream accrues, settlements are split automatically across key actors:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Cpu size={24} style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(0 0 8px var(--accent-cyan))', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.25rem' }}>70% — AI Provider (Recipient)</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Allocated to the active AI endpoint rendering the services.</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Award size={24} style={{ color: 'var(--color-text-primary)', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>20% — Model Creator</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Sent directly to the original developer who trained or uploaded the AI model.</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Landmark size={24} style={{ color: 'var(--state-success)', filter: 'drop-shadow(0 0 8px var(--state-success))', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: 'var(--state-success)', display: 'block', marginBottom: '0.25rem' }}>10% — Rheon DAO Treasury</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Routed to the DAO smart contract to fund developer grants and protocol maintenance.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDocTab === 2 && (
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem', background: 'linear-gradient(90deg, #fff 0%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>3. Lending & Yield Pool</h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Locked escrow deposits in active streams are never idle. Rheon routes this escrowed liquidity directly into <strong>Mock DeFi Yield Pools</strong>, generating interest dynamically at a targeted <strong>5% APY</strong>. Receivers withdraw this accrued yield per-second.
                  </p>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Users can also use the <strong>Lending Vault</strong> to borrow USDT. By locking native <strong>$BOT</strong> tokens as collateral (at a <strong>150% collateral ratio</strong>), users can borrow USDT directly from the accumulated pool at a fixed <strong>10% APR</strong>.
                  </p>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)', fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.5rem' }}>Borrow Example:</span>
                    Borrowing 10 USDT requires locking 15 BOT tokens as collateral (assuming BOT = $1.00). Upon repaying the 10 USDT + interest, the locked BOT is instantly released.
                  </div>
                </div>
              )}

              {activeDocTab === 3 && (
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem', background: 'linear-gradient(90deg, #fff 0%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>4. AI Sentry Node Mechanics</h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    The <strong>AI Sentry Node</strong> acts as a decentralized watchdog for streaming payments:
                  </p>
                  <ul style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
                    <li><strong>Continuous Health Checks:</strong> The Sentry Node pings the AI provider's API endpoint every 3 seconds to monitor uptime and latency.</li>
                    <li><strong>Outage Detection:</strong> If the API returns a non-200 error code or times out, the Sentry Node flags a service outage.</li>
                    <li><strong>Automated Intervention:</strong> The Sentry Node signs a transaction calling <code>pauseStream</code> on-chain, pausing the stream immediately. This protects the payer from paying for offline AI models.</li>
                    <li><strong>Dispute Resolution:</strong> If a dispute is raised, the Rheon DAO executes votes on-chain to decide whether to refund the sender or release funds.</li>
                  </ul>
                </div>
              )}

              {activeDocTab === 4 && (
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem', background: 'linear-gradient(90deg, #fff 0%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>5. Developer Stack</h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Rheon is built on cutting-edge EVM technology to support low latency and high frequency payments:
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 0.5rem', color: '#fff', fontWeight: 'bold' }}>Component</th>
                        <th style={{ padding: '0.75rem 0.5rem', color: '#fff', fontWeight: 'bold' }}>Technology</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Smart Contracts</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>Solidity v0.8.20, Hardhat, OpenZeppelin ERC-721 Receipts</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>L1 Blockchain</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>BOHR Chain EVM (RPC: <code>https://rpc.bohr.life</code>)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Monitoring Node</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>TypeScript, Node.js HTTP Server, PM2 process management</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Frontend App</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>React, Vite, Ethers.js v6, BohrScan Explorer integration</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3 style={{ color: '#fff', fontSize: '1.2rem', marginTop: '2rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>Deployed Smart Contracts</h3>
                  <ul style={{ color: 'var(--color-text-secondary)', paddingLeft: '0', listStyleType: 'none', fontSize: '0.85rem' }}>
                    
                    <li style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>BotFlowStreamer (Core Escrow):</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(streamerAddr || "0x93dEa3e3Ab76cbD15FcB7703170Ed37391f42204");
                            showToast("BotFlowStreamer address copied!", "success");
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          className="copy-btn-hover"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <code style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all', display: 'block', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-family-mono)' }}>
                        {streamerAddr || "0x93dEa3e3Ab76cbD15FcB7703170Ed37391f42204"}
                      </code>
                    </li>

                    <li style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>BotFlowReceipt (ERC-721 NFT):</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(receiptNftAddr || "0x8dd6165328d653aff0b68B78C3F3a9734b365Ad9");
                            showToast("BotFlowReceipt NFT address copied!", "success");
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          className="copy-btn-hover"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <code style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all', display: 'block', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-family-mono)' }}>
                        {receiptNftAddr || "0x8dd6165328d653aff0b68B78C3F3a9734b365Ad9"}
                      </code>
                    </li>

                    <li style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>Mock USDT Token:</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(usdtAddr || "0xa00D072A5A060f48Aa2aF79700a1FaA4140141c6");
                            showToast("Mock USDT address copied!", "success");
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          className="copy-btn-hover"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <code style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all', display: 'block', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-family-mono)' }}>
                        {usdtAddr || "0xa00D072A5A060f48Aa2aF79700a1FaA4140141c6"}
                      </code>
                    </li>

                    <li style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>Bohr DEX Router:</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(bdexAddr || "0xD6425a02f0845B8D99e349C34D2E7A576E177345");
                            showToast("Bohr DEX Router address copied!", "success");
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          className="copy-btn-hover"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <code style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all', display: 'block', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-family-mono)' }}>
                        {bdexAddr || "0xD6425a02f0845B8D99e349C34D2E7A576E177345"}
                      </code>
                    </li>

                    <li style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>Yield & Lending Vault:</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(vaultAddr || "");
                            showToast("Yield & Lending Vault address copied!", "success");
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          className="copy-btn-hover"
                          disabled={!vaultAddr}
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <code style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all', display: 'block', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-family-mono)' }}>
                        {vaultAddr || "Loading dynamic pool vault..."}
                      </code>
                    </li>

                  </ul>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
              <button
                className="btn btn-secondary"
                disabled={activeDocTab === 0}
                onClick={() => setActiveDocTab(prev => Math.max(0, prev - 1))}
                style={{ opacity: activeDocTab === 0 ? 0.3 : 1, minWidth: '100px' }}
              >
                ← Previous
              </button>
              <button
                className="btn btn-primary"
                disabled={activeDocTab === 4}
                onClick={() => setActiveDocTab(prev => Math.min(4, prev + 1))}
                style={{ opacity: activeDocTab === 4 ? 0.3 : 1, minWidth: '100px' }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="landing-footer" style={{ marginTop: '4rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2.5rem' }}>
        <div className="footer-content">
          <div className="footer-brand-section">
            <div className="brand" onClick={() => setView("landing")} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
              <img src="/rheon_logo.png" alt="Rheon Logo" className="brand-logo" style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '6px' }} />
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

      {showReceiptModal && selectedReceiptStream && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '90%', padding: '2rem 1rem', textAlign: 'center', border: '1px solid #8b5cf6', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)' }}>
            <h3 style={{ color: '#c084fc', marginBottom: '1.5rem' }}>Rheon Proof-of-Compute Receipt</h3>
            
            {/* NFT Card */}
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)', marginBottom: '1.5rem', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#c084fc', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>RHEON RECEIPT NFT</span>
                <img src="/rheon_logo.png" alt="Rheon Logo" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '4px' }} />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Token ID (Stream ID)</span>
                <span style={{ fontSize: '1.1rem', color: '#fff', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>#{selectedReceiptStream.id}</span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Compute Work Value</span>
                <span style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-family-mono)', fontWeight: '800' }}>
                  {selectedReceiptStream.withdrawn.toFixed(4)} USDT
                </span>
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Sender</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontFamily: 'var(--font-family-mono)' }}>
                    {selectedReceiptStream.sender.slice(0, 6)}...{selectedReceiptStream.sender.slice(-4)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>AI Provider</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontFamily: 'var(--font-family-mono)' }}>
                    {selectedReceiptStream.receiver.slice(0, 6)}...{selectedReceiptStream.receiver.slice(-4)}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed rgba(139, 92, 246, 0.2)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                  VERIFIED ON EXPLORER
                </span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-family-mono)' }}>ERC-721 Standard</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              This ERC-721 Receipt was minted on BOT Chain Testnet upon stream cancellation to verify payment for compute services rendered.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a 
                href={`https://scan.bohr.life/token/${receiptNftAddr || streamerAddr}/instance/${selectedReceiptStream.id}`} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-primary" 
                style={{ flex: 1, textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }}
              >
                View on BohrScan
              </a>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, fontSize: '0.85rem', padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }} 
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceiptStream(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {txModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '95%', padding: '2rem 1rem', textAlign: 'center', border: txModal.status === 'error' ? '1px solid var(--state-error)' : txModal.status === 'success' ? '1px solid var(--state-success)' : '1px solid var(--accent-cyan)', boxShadow: txModal.status === 'error' ? '0 8px 32px rgba(255, 59, 48, 0.15)' : txModal.status === 'success' ? '0 8px 32px rgba(0, 255, 157, 0.15)' : '0 8px 32px rgba(0, 242, 254, 0.15)' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontFamily: 'var(--font-family-mono)' }}>
              {txModal.title}
            </h3>

            {txModal.status === 'signing' && (
              <div>
                <div className="network-dot" style={{ width: '40px', height: '40px', margin: '0 auto 1.5rem auto', backgroundColor: 'var(--accent-cyan)', boxShadow: '0 0 15px var(--accent-cyan)' }}></div>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>Waiting for Wallet Approval</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Please confirm the transaction in your MetaMask wallet.
                </p>
              </div>
            )}

            {txModal.status === 'pending' && (
              <div>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 242, 254, 0.1)', borderTop: '3px solid var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 1.5rem auto', animation: 'spin 1s linear infinite' }}></div>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>Transaction Broadcasting...</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Waiting for transaction to be mined on Bohr Chain.
                </p>
                {txModal.txHash && (
                  <a 
                    href={`https://scan.bohr.life/tx/${txModal.txHash}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary" 
                    style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '100%', fontSize: '0.85rem', gap: '0.5rem' }}
                  >
                    View on BohrScan Explorer
                    <ArrowDownUp size={14} />
                  </a>
                )}
              </div>
            )}

            {txModal.status === 'success' && (
              <div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 157, 0.1)', border: '2px solid var(--state-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: 'var(--state-success)' }}>
                  <ShieldCheck size={24} />
                </div>
                <h4 style={{ color: 'var(--state-success)', marginBottom: '0.75rem' }}>Transaction Confirmed!</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Your transaction has been finalized on-chain.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {txModal.txHash && (
                    <a 
                      href={`https://scan.bohr.life/tx/${txModal.txHash}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-primary" 
                      style={{ flex: 1, textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }}
                    >
                      View on Explorer
                    </a>
                  )}
                  <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.85rem', padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }} onClick={closeTxModal}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {txModal.status === 'error' && (
              <div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '2px solid var(--state-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: 'var(--state-error)' }}>
                  <ShieldAlert size={24} />
                </div>
                <h4 style={{ color: 'var(--state-error)', marginBottom: '0.75rem' }}>Transaction Failed</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', wordBreak: 'break-word', maxHeight: '120px', overflowY: 'auto' }}>
                  {txModal.errorMsg || "An unknown error occurred during transaction execution."}
                </p>
                <button className="btn btn-danger" style={{ width: '100%', fontSize: '0.85rem' }} onClick={closeTxModal}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDetailModal && selectedDetailStream && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '92%', padding: '2rem 1rem', borderRadius: '24px', textAlign: 'center', color: 'var(--color-text-primary)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0, 242, 254, 0.1)', animation: 'walletFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }} 
              onClick={() => { setShowDetailModal(false); setSelectedDetailStream(null); }}
            >
              ×
            </button>

            {/* Receipt Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                <Activity size={32} />
              </div>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.25rem', fontFamily: 'var(--font-family-mono)', color: '#fff' }}>Rheon PayFi Stream Receipt</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '1.5rem' }}>BOT Chain Settlement Verified</span>

            {/* Dark Card Container */}
            <div style={{ background: 'rgba(7, 8, 13, 0.5)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--glass-border)', textAlign: 'left', marginBottom: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Payment Type:</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  📖 Pay-Per-Second Stream
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Amount (Initial Deposit):</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--accent-cyan)', fontWeight: '800', fontFamily: 'var(--font-family-mono)' }}>
                  ${selectedDetailStream.deposit.toFixed(2)} USDT
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Date & Time Started:</span>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', fontFamily: 'var(--font-family-mono)' }}>
                  {new Date(selectedDetailStream.startTime).toLocaleString()}
                </span>
              </div>

              {/* Payer Agent Address */}
              {/* Payer Agent Address */}
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>Payer Agent Address</span>
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDetailStream.sender);
                    showToast("Payer address copied to clipboard!");
                  }}
                  style={{ background: 'rgba(7, 8, 13, 0.8)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontFamily: 'var(--font-family-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  title="Click to copy"
                >
                  {selectedDetailStream.sender}
                </div>
              </div>

              {/* Recipient Agent Address */}
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>Recipient AI Agent Address</span>
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDetailStream.receiver);
                    showToast("Recipient address copied to clipboard!");
                  }}
                  style={{ background: 'rgba(7, 8, 13, 0.8)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontFamily: 'var(--font-family-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  title="Click to copy"
                >
                  {selectedDetailStream.receiver}
                </div>
              </div>

              {/* Sentry Node Address */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>Sentry Node Address</span>
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDetailStream.sentryNode);
                    showToast("Sentry address copied to clipboard!");
                  }}
                  style={{ background: 'rgba(7, 8, 13, 0.8)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontFamily: 'var(--font-family-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  title="Click to copy"
                >
                  {selectedDetailStream.sentryNode}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div style={{ background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '12px', padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: '1.4', marginBottom: '1.5rem' }}>
              💡 <strong>Rheon PayFi Stream:</strong> Locked deposits route to Mock DeFi Yield Vaults at 5% APY. Receivers withdraw accrued yield per-second on-chain.
            </div>

            {/* Actions for active stream */}
            {selectedDetailStream.isActive && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button 
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                  onClick={() => { toggleStreamPause(selectedDetailStream.id); setShowDetailModal(false); }}
                >
                  {selectedDetailStream.isPaused ? "Resume" : "Pause"}
                </button>
                <button 
                  className="btn btn-danger"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                  onClick={() => { handleCancelStream(selectedDetailStream.id); setShowDetailModal(false); }}
                >
                  Cancel Stream
                </button>
                <button 
                  className="btn"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem', border: '1px solid var(--state-warning)', color: 'var(--state-warning)', background: 'transparent' }}
                  onClick={() => { handleDisputeStream(selectedDetailStream.id); setShowDetailModal(false); }}
                >
                  Dispute
                </button>
              </div>
            )}

            {/* Bottom main action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, fontSize: '0.85rem', borderRadius: '50px', height: '44px', padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }} 
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailStream(null);
                }}
              >
                Close
              </button>
              <a 
                href={`https://scan.bohr.life/token/${receiptNftAddr || streamerAddr}/instance/${selectedDetailStream.id}`} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-primary" 
                style={{ flex: 1, textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', borderRadius: '50px', height: '44px', fontWeight: 'bold', padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }}
              >
                Verify on BohrScan
              </a>
            </div>

          </div>
        </div>
      )}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'rgba(13, 15, 26, 0.9)',
          backdropFilter: 'blur(12px)',
          border: toast.type === 'error' ? '1px solid var(--state-error)' : toast.type === 'warning' ? '1px solid var(--state-warning)' : '1px solid var(--accent-cyan)',
          boxShadow: toast.type === 'error' ? '0 8px 32px rgba(255, 59, 48, 0.25)' : toast.type === 'warning' ? '0 8px 32px rgba(255, 179, 0, 0.25)' : '0 8px 32px rgba(0, 242, 254, 0.25)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          color: '#fff',
          fontFamily: 'var(--font-family-mono)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          animation: 'fadeInSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toast.type === 'error' ? (
            <ShieldAlert size={16} style={{ color: 'var(--state-error)' }} />
          ) : toast.type === 'warning' ? (
            <AlertTriangle size={16} style={{ color: 'var(--state-warning)' }} />
          ) : (
            <Check size={16} style={{ color: 'var(--state-success)' }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
