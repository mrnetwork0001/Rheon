const hre = require("hardhat");

async function main() {
  const streamerAddress = "0x4070a987c938a18ceA469e61c4c12eaC600625f0";
  const streamer = await hre.ethers.getContractAt("BotFlowStreamer", streamerAddress);
  
  console.log("receiptNFT:", await streamer.receiptNFT());
  console.log("priceOracle:", await streamer.priceOracle());
  console.log("yieldVault:", await streamer.yieldVault());
  console.log("daoContract:", await streamer.daoContract());
}

main().catch(console.error);
