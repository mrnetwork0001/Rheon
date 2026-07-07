import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.BOTCHAIN_RPC_URL || "https://rpc.bohr.life";
const YIELD_POOL_ADDRESS = "0xCBf8cF8F5cAc904b1fb37379E225F02126DDe879";
const USDT_ADDRESS = "0xa00D072A5A060f48Aa2aF79700a1FaA4140141c6";
const SENTRY_PRIVATE_KEY = process.env.SENTRY_PRIVATE_KEY || "";

const YIELD_POOL_ABI = [
  "event Borrowed(address indexed borrower, uint256 amount, uint256 collateral)",
  "event Repaid(address indexed borrower, uint256 principalRepaid, uint256 interestPaid)",
  "event Liquidated(address indexed borrower, address indexed liquidator, uint256 debtRepaid, uint256 collateralReleased)",
  "function borrows(address borrower) external view returns (uint256 principal, uint256 collateral, uint256 borrowTime)",
  "function getDebt(address borrower) public view returns (uint256)",
  "function isLiquidatable(address borrower) public view returns (bool)",
  "function liquidate(address token, address borrower) external"
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

async function startLiquidationBot() {
  console.log("[BOT] Starting Rheon Liquidation Watcher Node...");
  console.log(`[BOT] Connecting to RPC: ${RPC_URL}`);

  if (!SENTRY_PRIVATE_KEY) {
    console.error("[BOT] Error: SENTRY_PRIVATE_KEY not configured. Cannot sign liquidation txs.");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(SENTRY_PRIVATE_KEY, provider);
  console.log(`[BOT] Liquidator Wallet Address: ${wallet.address}`);

  const poolContract = new ethers.Contract(YIELD_POOL_ADDRESS, YIELD_POOL_ABI, wallet);
  const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);

  // Active borrowers set
  const activeBorrowers = new Set<string>();

  // Fetch historical Borrowed events to find all unique borrowers
  try {
    console.log("[BOT] Scanning historical Borrowed events...");
    // Scan last 5000 blocks for simplicity
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - 5000);

    const borrowFilter = poolContract.filters.Borrowed();
    const events = await poolContract.queryFilter(borrowFilter, startBlock, currentBlock);

    for (const event of events) {
      // In ethers v6, event.args is an array/object
      const borrower = (event as any).args[0];
      activeBorrowers.add(borrower);
    }
    console.log(`[BOT] Found ${activeBorrowers.size} historical borrowers.`);
  } catch (error: any) {
    console.warn(`[BOT] Historical event scan warning: ${error.message}. Fallback to dynamic event listeners.`);
  }

  // Subscribe to new Borrowed events in real-time
  poolContract.on("Borrowed", (borrower, amount, collateral) => {
    console.log(`[BOT] On-chain Event: Borrowed detected for ${borrower}. Adding to watch-list.`);
    activeBorrowers.add(borrower);
  });

  poolContract.on("Repaid", (borrower, principal, interest) => {
    console.log(`[BOT] On-chain Event: Repaid detected for ${borrower}. Removing from active watch-list.`);
    activeBorrowers.delete(borrower);
  });

  poolContract.on("Liquidated", (borrower, liquidator, debt, collateral) => {
    console.log(`[BOT] On-chain Event: Liquidated detected for ${borrower} by ${liquidator}.`);
    activeBorrowers.delete(borrower);
  });

  // Watcher loop: run health-check checks every 10 seconds
  setInterval(async () => {
    if (activeBorrowers.size === 0) {
      console.log("[BOT] No active borrows to monitor.");
      return;
    }

    console.log(`[BOT] Monitoring ${activeBorrowers.size} active loans...`);

    for (const borrower of activeBorrowers) {
      try {
        // Double check principal in contract
        const borrowData = await poolContract.borrows(borrower);
        const principal = BigInt(borrowData.principal);

        if (principal === 0n) {
          activeBorrowers.delete(borrower);
          continue;
        }

        const liquidatable = await poolContract.isLiquidatable(borrower);
        const debt = await poolContract.getDebt(borrower);

        console.log(`[BOT] Borrower: ${borrower} | Debt: ${ethers.formatUnits(debt, 6)} USDT | Liquidatable: ${liquidatable}`);

        if (liquidatable) {
          console.warn(`[BOT] ALERT: Borrower ${borrower} is liquidatable! Repaying debt of ${ethers.formatUnits(debt, 6)} USDT...`);

          // Verify liquidator USDT balance
          const balance = await usdtContract.balanceOf(wallet.address);
          if (BigInt(balance) < BigInt(debt)) {
            console.error(`[BOT] Error: Liquidator USDT balance (${ethers.formatUnits(balance, 6)}) is insufficient to cover debt of ${ethers.formatUnits(debt, 6)} USDT.`);
            continue;
          }

          // Approve pool contract if allowance is low
          const allowance = await usdtContract.allowance(wallet.address, YIELD_POOL_ADDRESS);
          if (BigInt(allowance) < BigInt(debt)) {
            console.log("[BOT] Approving Yield Pool to spend USDT...");
            const appTx = await usdtContract.approve(YIELD_POOL_ADDRESS, ethers.MaxUint256);
            await appTx.wait();
            console.log("[BOT] Approve completed.");
          }

          // Execute Liquidation
          console.log(`[BOT] Submitting liquidation transaction for ${borrower}...`);
          const tx = await poolContract.liquidate(USDT_ADDRESS, borrower);
          console.log(`[BOT] Transaction sent: ${tx.hash}`);
          
          const receipt = await tx.wait();
          console.log(`[BOT] SUCCESS: Liquidated borrower ${borrower} in block ${receipt.blockNumber}! Collateral claimed.`);
          
          activeBorrowers.delete(borrower);
        }
      } catch (err: any) {
        console.error(`[BOT] Monitor failed for borrower ${borrower}: ${err.message}`);
      }
    }
  }, 10000);
}

startLiquidationBot().catch(err => {
  console.error("[BOT] Fatal crash in liquidation watcher:", err);
});
