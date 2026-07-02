const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy BotFlowStreamer
  console.log("Deploying BotFlowStreamer...");
  const BotFlowStreamer = await hre.ethers.getContractFactory("BotFlowStreamer");
  const streamer = await BotFlowStreamer.deploy();
  await streamer.waitForDeployment();
  const streamerAddress = await streamer.getAddress();
  console.log("BotFlowStreamer deployed to:", streamerAddress);

  console.log("\nDeployment completed successfully!");
  console.log("-----------------------------------");
  console.log("BotFlowStreamer:", streamerAddress);
  console.log("-----------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
