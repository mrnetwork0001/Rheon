const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy MockUSDT
  console.log("Deploying MockUSDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("MockUSDT deployed to:", usdtAddress);

  // 2. Deploy BotFlowStreamer
  console.log("Deploying BotFlowStreamer...");
  const BotFlowStreamer = await hre.ethers.getContractFactory("BotFlowStreamer");
  const streamer = await BotFlowStreamer.deploy();
  await streamer.waitForDeployment();
  const streamerAddress = await streamer.getAddress();
  console.log("BotFlowStreamer deployed to:", streamerAddress);

  // 3. Deploy MockBDEX (funded with 0.1 native tokens for testing, if possible)
  console.log("Deploying MockBDEX...");
  const MockBDEX = await hre.ethers.getContractFactory("MockBDEX");
  const bdex = await MockBDEX.deploy(usdtAddress, {
    value: hre.ethers.parseEther("0.1") // initial native gas pool
  });
  await bdex.waitForDeployment();
  const bdexAddress = await bdex.getAddress();
  console.log("MockBDEX deployed to:", bdexAddress);

  // 4. Fund MockBDEX with USDT liquidity (e.g., 500,000 USDT)
  console.log("Funding MockBDEX with USDT liquidity...");
  const transferAmount = hre.ethers.parseUnits("500000", 6); // USDT has 6 decimals
  const tx = await usdt.transfer(bdexAddress, transferAmount);
  await tx.wait();
  console.log("MockBDEX successfully funded with 500,000 USDT.");

  console.log("\nDeployment completed successfully!");
  console.log("-----------------------------------");
  console.log("MockUSDT:", usdtAddress);
  console.log("BotFlowStreamer:", streamerAddress);
  console.log("MockBDEX:", bdexAddress);
  console.log("-----------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
