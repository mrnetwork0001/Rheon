const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up Testnet Liquidity with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy TestUSDT
  console.log("\nDeploying TestUSDT...");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const usdt = await TestUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("TestUSDT deployed to:", usdtAddress);

  // 2. Add Liquidity to BDEX Testnet Router
  const BDEX_ROUTER = "0xD6425a02f0845B8D99e349C34D2E7A576E177345";
  const ROUTER_ABI = [
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)"
  ];
  const router = new ethers.Contract(BDEX_ROUTER, ROUTER_ABI, deployer);

  // We will provide 1 BOT and 1000 USDT to the pool (assuming 1 BOT = 1000 USDT roughly for demo)
  const botAmount = ethers.parseEther("0.1"); // Let's use 0.1 BOT just to be safe on balance
  const usdtAmount = ethers.parseUnits("100", 6); // 100 USDT

  console.log("\nApproving Router to spend USDT...");
  const tx1 = await usdt.approve(BDEX_ROUTER, usdtAmount);
  await tx1.wait();
  console.log("Approved.");

  console.log("\nAdding liquidity (0.1 BOT + 100 USDT) to BDEX Router...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  
  try {
    const tx2 = await router.addLiquidityETH(
      usdtAddress,
      usdtAmount,
      0, // min token
      0, // min eth
      deployer.address,
      deadline,
      { value: botAmount }
    );
    const receipt = await tx2.wait();
    console.log("Liquidity added successfully! Tx Hash:", receipt.hash);
  } catch (error) {
    console.error("Failed to add liquidity:", error);
  }

  console.log("\n=================================");
  console.log("VITE_USDT_ADDRESS=" + usdtAddress);
  console.log("=================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
