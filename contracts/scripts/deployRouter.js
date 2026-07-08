const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RheonSwapRouter with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const BDEX_ROUTER = "0x1414eD29FdFD322c3c0a830330ed982E2D629e76"; // Mainnet BDEX Router

  console.log("Deploying RheonSwapRouter...");
  const RheonSwapRouter = await hre.ethers.getContractFactory("RheonSwapRouter");
  const router = await RheonSwapRouter.deploy(BDEX_ROUTER);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  
  console.log("\nRheonSwapRouter deployed successfully to:", routerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
