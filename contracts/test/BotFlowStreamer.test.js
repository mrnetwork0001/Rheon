const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BotFlow Ecosystem", function () {
  let MockUSDT, mockUSDT;
  let BotFlowStreamer, streamer;
  let MockBDEX, bdex;
  let owner, receiver, sentry, otherUser;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1,000,000 USDT (6 decimals)
  const STREAM_DEPOSIT = ethers.parseUnits("100", 6); // 100 USDT
  const RATE_PER_SECOND = ethers.parseUnits("1", 6); // 1 USDT per second

  beforeEach(async function () {
    [owner, receiver, sentry, otherUser] = await ethers.getSigners();

    // 1. Deploy MockUSDT
    MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();

    // 2. Deploy BotFlowStreamer
    BotFlowStreamer = await ethers.getContractFactory("BotFlowStreamer");
    streamer = await BotFlowStreamer.deploy();
    await streamer.waitForDeployment();

    // 3. Deploy MockBDEX
    MockBDEX = await ethers.getContractFactory("MockBDEX");
    bdex = await MockBDEX.deploy(await mockUSDT.getAddress(), {
      value: ethers.parseEther("1.0") // 1 BOT native funding
    });
    await bdex.waitForDeployment();

    // Transfer some USDT to MockBDEX
    await mockUSDT.transfer(await bdex.getAddress(), ethers.parseUnits("10000", 6));

    // Approve streamer to spend owner's USDT
    await mockUSDT.approve(await streamer.getAddress(), INITIAL_SUPPLY);
  });

  describe("BotFlowStreamer", function () {
    it("Should create a stream correctly", async function () {
      const tx = await streamer.createStream(
        receiver.address,
        await mockUSDT.getAddress(),
        STREAM_DEPOSIT,
        RATE_PER_SECOND,
        sentry.address
      );

      const receipt = await tx.wait();
      
      const stream = await streamer.streams(1);
      expect(stream.sender).to.equal(owner.address);
      expect(stream.receiver).to.equal(receiver.address);
      expect(stream.token).to.equal(await mockUSDT.getAddress());
      expect(stream.deposit).to.equal(STREAM_DEPOSIT);
      expect(stream.ratePerSecond).to.equal(RATE_PER_SECOND);
      expect(stream.sentryNode).to.equal(sentry.address);
      expect(stream.isActive).to.be.true;
      expect(stream.isPaused).to.be.false;
    });

    it("Should accrue tokens over time", async function () {
      await streamer.createStream(
        receiver.address,
        await mockUSDT.getAddress(),
        STREAM_DEPOSIT,
        RATE_PER_SECOND,
        sentry.address
      );

      // Fast forward time by 5 seconds
      await ethers.provider.send("evm_increaseTime", [5]);
      await ethers.provider.send("evm_mine");

      const accrued = await streamer.getAccrued(1);
      // It should be around 5-6 seconds (since block mining takes 1 sec)
      expect(accrued).to.be.at.least(ethers.parseUnits("5", 6));
    });

    it("Should allow receiver to withdraw accrued tokens", async function () {
      await streamer.createStream(
        receiver.address,
        await mockUSDT.getAddress(),
        STREAM_DEPOSIT,
        RATE_PER_SECOND,
        sentry.address
      );

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      const accrued = await streamer.getAccrued(1);
      
      // Perform withdrawal
      const withdrawAmount = ethers.parseUnits("5", 6);
      const receiverInitialBalance = await mockUSDT.balanceOf(receiver.address);
      
      await streamer.connect(receiver).withdrawFromStream(1, withdrawAmount);

      const receiverFinalBalance = await mockUSDT.balanceOf(receiver.address);
      expect(receiverFinalBalance - receiverInitialBalance).to.equal(withdrawAmount);

      const stream = await streamer.streams(1);
      expect(stream.withdrawnAmount).to.equal(withdrawAmount);
    });

    it("Should allow sentry to pause and resume the stream", async function () {
      await streamer.createStream(
        receiver.address,
        await mockUSDT.getAddress(),
        STREAM_DEPOSIT,
        RATE_PER_SECOND,
        sentry.address
      );

      await ethers.provider.send("evm_increaseTime", [5]);
      await ethers.provider.send("evm_mine");

      // Pause the stream via sentry node
      await streamer.connect(sentry).pauseStream(1);
      let stream = await streamer.streams(1);
      expect(stream.isPaused).to.be.true;

      const accruedAtPause = await streamer.getAccrued(1);

      // Fast forward time while paused
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      // Accrued amount should not increase
      const accruedDuringPause = await streamer.getAccrued(1);
      expect(accruedDuringPause).to.equal(accruedAtPause);

      // Resume stream
      await streamer.connect(sentry).resumeStream(1);
      stream = await streamer.streams(1);
      expect(stream.isPaused).to.be.false;

      // Stop time should be pushed out
      expect(stream.stopTime).to.be.greaterThan(stream.startTime + (STREAM_DEPOSIT / RATE_PER_SECOND));
    });

    it("Should allow sentry to adjust the flow rate", async function () {
      await streamer.createStream(
        receiver.address,
        await mockUSDT.getAddress(),
        STREAM_DEPOSIT,
        RATE_PER_SECOND,
        sentry.address
      );

      // Adjust rate: double it
      const NEW_RATE = ethers.parseUnits("2", 6);
      await streamer.connect(sentry).adjustStreamRate(1, NEW_RATE);

      const stream = await streamer.streams(1);
      expect(stream.ratePerSecond).to.equal(NEW_RATE);
    });

    it("Should refund sender and pay receiver upon cancellation", async function () {
      await streamer.createStream(
        receiver.address,
        await mockUSDT.getAddress(),
        STREAM_DEPOSIT,
        RATE_PER_SECOND,
        sentry.address
      );

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      const accrued = await streamer.getAccrued(1);

      const senderInitialBalance = await mockUSDT.balanceOf(owner.address);
      const receiverInitialBalance = await mockUSDT.balanceOf(receiver.address);

      await streamer.connect(sentry).cancelStream(1);

      const senderFinalBalance = await mockUSDT.balanceOf(owner.address);
      const receiverFinalBalance = await mockUSDT.balanceOf(receiver.address);

      // Receiver gets accrued
      expect(receiverFinalBalance - receiverInitialBalance).to.equal(accrued);
      // Sender gets remaining
      expect(senderFinalBalance - senderInitialBalance).to.equal(STREAM_DEPOSIT - accrued);

      const stream = await streamer.streams(1);
      expect(stream.isActive).to.be.false;
    });
  });

  describe("MockBDEX", function () {
    it("Should swap BOT for USDT correctly", async function () {
      const swapAmount = ethers.parseEther("0.1"); // 0.1 BOT
      const expectedUSDT = (swapAmount * 2n) / 10n**12n; // 0.2 USDT

      const userInitialUSDT = await mockUSDT.balanceOf(otherUser.address);

      await bdex.connect(otherUser).swapBOTForUSDT({ value: swapAmount });

      const userFinalUSDT = await mockUSDT.balanceOf(otherUser.address);
      expect(userFinalUSDT - userInitialUSDT).to.equal(expectedUSDT);
    });

    it("Should swap USDT for BOT correctly", async function () {
      // Transfer some USDT to otherUser and approve bdex
      const usdtAmount = ethers.parseUnits("10", 6); // 10 USDT
      await mockUSDT.transfer(otherUser.address, usdtAmount);
      await mockUSDT.connect(otherUser).approve(await bdex.getAddress(), usdtAmount);

      const expectedBOT = (usdtAmount * 10n**12n) / 2n; // 5 BOT

      const userInitialBOT = await ethers.provider.getBalance(otherUser.address);

      const tx = await bdex.connect(otherUser).swapUSDTForBOT(usdtAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const userFinalBOT = await ethers.provider.getBalance(otherUser.address);
      expect(userFinalBOT - userInitialBOT + gasUsed).to.equal(expectedBOT);
    });
  });
});
