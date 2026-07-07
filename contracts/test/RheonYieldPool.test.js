const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Rheon DeFi Yield Pool", function () {
  let streamer, token, oracle, pool;
  let owner, user, borrower, liquidator;

  beforeEach(async function () {
    [owner, user, borrower, liquidator] = await ethers.getSigners();

    // 1. Deploy Mock USDT token
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    token = await TestUSDT.deploy();
    await token.waitForDeployment();

    // Transfer token to user and liquidator from deployer
    await token.transfer(user.address, ethers.parseUnits("1000", 6));
    await token.transfer(liquidator.address, ethers.parseUnits("1000", 6));

    // 2. Deploy RheonPriceOracle ($1.00 per BOT = 1000000)
    const RheonPriceOracle = await ethers.getContractFactory("RheonPriceOracle");
    oracle = await RheonPriceOracle.deploy(1000000);
    await oracle.waitForDeployment();

    // 3. Deploy RheonYieldPool
    const RheonYieldPool = await ethers.getContractFactory("RheonYieldPool");
    pool = await RheonYieldPool.deploy(await oracle.getAddress());
    await pool.waitForDeployment();

    // Fund pool with USDT for liquidity (using user's tokens)
    const fundAmount = ethers.parseUnits("500", 6);
    await token.connect(user).approve(await pool.getAddress(), fundAmount);
    await pool.connect(user).deposit(await token.getAddress(), fundAmount);
  });

  it("should allow lending deposits and withdrawals", async function () {
    const depositAmount = ethers.parseUnits("100", 6);
    await token.connect(user).approve(await pool.getAddress(), depositAmount);
    await pool.connect(user).deposit(await token.getAddress(), depositAmount);

    expect(await pool.totalDeposits()).to.equal(ethers.parseUnits("600", 6));

    // Withdraw
    await pool.connect(user).withdraw(await token.getAddress(), depositAmount);
    expect(await pool.totalDeposits()).to.equal(ethers.parseUnits("500", 6));
  });

  it("should allow borrowing USDT with native BOT collateral (150% ratio)", async function () {
    const borrowAmount = ethers.parseUnits("100", 6); // 100 USDT
    // BOT price is $1.00. 150% collateral of 100 USDT is 150 USDT.
    // 150 USDT / $1.00 = 150 BOT (in 18 decimals = 150e18)
    const requiredCollateral = ethers.parseEther("150");

    const tx = await pool.connect(borrower).borrow(
      await token.getAddress(),
      borrowAmount,
      { value: requiredCollateral }
    );
    await tx.wait();

    const borrowDetails = await pool.borrows(borrower.address);
    expect(borrowDetails.principal).to.equal(borrowAmount);
    expect(borrowDetails.collateral).to.equal(requiredCollateral);
    expect(await pool.totalBorrows()).to.equal(borrowAmount);
  });

  it("should allow repaying borrows and releasing collateral", async function () {
    const borrowAmount = ethers.parseUnits("100", 6);
    const collateral = ethers.parseEther("150");
    await pool.connect(borrower).borrow(await token.getAddress(), borrowAmount, { value: collateral });

    // Transfer tokens to borrower to spend for repayment
    await token.transfer(borrower.address, ethers.parseUnits("110", 6));
    await token.connect(borrower).approve(await pool.getAddress(), ethers.parseUnits("110", 6));

    const initialBotBalance = await ethers.provider.getBalance(borrower.address);
    const tx = await pool.connect(borrower).repay(await token.getAddress(), ethers.parseUnits("105", 6));
    await tx.wait();

    // Borrow should be cleared
    const borrowDetails = await pool.borrows(borrower.address);
    expect(borrowDetails.principal).to.equal(0);
    expect(await pool.totalBorrows()).to.equal(0);

    // Collateral BOT should be returned
    const finalBotBalance = await ethers.provider.getBalance(borrower.address);
    expect(finalBotBalance).to.be.gt(initialBotBalance);
  });

  it("should trigger liquidation when BOT price drops below threshold", async function () {
    const borrowAmount = ethers.parseUnits("100", 6);
    const collateral = ethers.parseEther("150");
    await pool.connect(borrower).borrow(await token.getAddress(), borrowAmount, { value: collateral });

    // Verify it is not liquidatable initially
    expect(await pool.isLiquidatable(borrower.address)).to.be.false;

    // Drop BOT price from $1.00 to $0.70 (collateral value = 150 * 0.70 = 105 USDT, which is < 100 * 1.2 = 120 USDT)
    await oracle.updatePrice(700000);
    expect(await pool.isLiquidatable(borrower.address)).to.be.true;

    // Liquidate
    await token.connect(liquidator).approve(await pool.getAddress(), ethers.parseUnits("110", 6));
    const tx = await pool.connect(liquidator).liquidate(await token.getAddress(), borrower.address);
    await tx.wait();

    // Verify borrower loan is wiped
    const borrowDetails = await pool.borrows(borrower.address);
    expect(borrowDetails.principal).to.equal(0);
  });
});
