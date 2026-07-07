// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BotFlowReceipt.sol";
import "./RheonPriceOracle.sol";
import "./RheonYieldPool.sol";
import "./BotFlowDAO.sol";

contract BotFlowStreamer is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Stream {
        address sender;
        address[] receivers;
        uint256[] sharePercentages;
        address token;
        uint256 deposit; // Total tokens ever deposited (initial + topups)
        uint256 ratePerSecond; // Flow rate in tokens per second
        uint256 startTime;
        uint256 stopTime; // Timestamp when deposit runs out
        uint256 remainingBalance; // Balance currently locked in contract for this stream
        uint256 accruedUntilLastUpdate; // Total tokens accrued from start until last update
        uint256 withdrawnAmount; // Total tokens withdrawn by receivers
        uint256 lastUpdateTime;
        address sentryNode; // AI Sentry Node address that can monitor and pause/adjust this stream
        bool isPaused;
        bool isDisputed;
        bool isActive;
    }

    uint256 public nextStreamId = 1;
    mapping(uint256 => Stream) public streams;
    BotFlowReceipt public receiptNFT;
    RheonYieldPool public yieldVault;
    RheonPriceOracle public priceOracle;
    BotFlowDAO public daoContract;

    constructor() {
        receiptNFT = new BotFlowReceipt(address(this));
        // Deploy price oracle with $1.00 initial BOT price (6 decimals)
        priceOracle = new RheonPriceOracle(1000000);
        // Deploy yield pool pointing to the oracle
        yieldVault = new RheonYieldPool(address(priceOracle));
        daoContract = new BotFlowDAO(address(this));
    }

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address[] receivers,
        uint256[] sharePercentages,
        address token,
        uint256 deposit,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 stopTime,
        address sentryNode
    );
    event StreamWithdrawn(uint256 indexed streamId, address indexed by, uint256 amount);
    event StreamPaused(uint256 indexed streamId, address indexed by);
    event StreamResumed(uint256 indexed streamId, address indexed by, uint256 newStopTime);
    event StreamAdjusted(uint256 indexed streamId, address indexed by, uint256 oldRate, uint256 newRate, uint256 newStopTime);
    event StreamCancelled(uint256 indexed streamId, uint256 receiverAmount, uint256 senderAmount);
    event StreamToppedUp(uint256 indexed streamId, address indexed sender, uint256 amount, uint256 newStopTime);
    event StreamDisputed(uint256 indexed streamId, address indexed by);
    event DisputeResolved(uint256 indexed streamId, bool refundUser);

    function _isReceiver(uint256 streamId, address addr) internal view returns (bool) {
        address[] memory recs = streams[streamId].receivers;
        for(uint i = 0; i < recs.length; i++) {
            if (recs[i] == addr) return true;
        }
        return false;
    }

    modifier onlyStreamParty(uint256 streamId) {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(
            msg.sender == stream.sender || 
            msg.sender == stream.sentryNode ||
            _isReceiver(streamId, msg.sender),
            "Not authorized"
        );
        _;
    }

    modifier onlyStreamSenderOrSentry(uint256 streamId) {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(
            msg.sender == stream.sender || 
            msg.sender == stream.sentryNode,
            "Not sender or sentry"
        );
        _;
    }

    /**
     * @notice Helper getter for the frontend since public mapping getters drop dynamic arrays.
     */
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    /**
     * @notice Creates a new payment stream.
     * @param receivers The addresses receiving the tokens.
     * @param sharePercentages The percentage splits for each receiver (must sum to 100).
     * @param token The ERC20 token address.
     * @param deposit The amount of tokens to deposit.
     * @param ratePerSecond Flow rate of tokens per second.
     * @param sentryNode The AI Sentry Node address authorized to monitor/pause the stream.
     */
    function createStream(
        address[] memory receivers,
        uint256[] memory sharePercentages,
        address token,
        uint256 deposit,
        uint256 ratePerSecond,
        address sentryNode
    ) external nonReentrant returns (uint256) {
        require(receivers.length > 0, "No receivers specified");
        require(receivers.length == sharePercentages.length, "Array length mismatch");
        require(token != address(0), "Token cannot be zero address");
        require(deposit > 0, "Deposit must be greater than zero");
        require(ratePerSecond > 0, "Rate must be greater than zero");
        require(deposit >= ratePerSecond, "Deposit must be at least rate per second");

        uint256 totalPercentage = 0;
        for (uint i = 0; i < sharePercentages.length; i++) {
            require(receivers[i] != address(0), "Receiver cannot be zero address");
            totalPercentage += sharePercentages[i];
        }
        require(totalPercentage == 100, "Percentages must sum to 100");

        // Transfer tokens to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), deposit);

        // Deposit into DeFi yield vault for capital efficiency
        IERC20(token).forceApprove(address(yieldVault), deposit);
        yieldVault.deposit(token, deposit);

        uint256 duration = deposit / ratePerSecond;
        uint256 stopTime = block.timestamp + duration;
        uint256 streamId = nextStreamId++;

        streams[streamId] = Stream({
            sender: msg.sender,
            receivers: receivers,
            sharePercentages: sharePercentages,
            token: token,
            deposit: deposit,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            stopTime: stopTime,
            remainingBalance: deposit,
            accruedUntilLastUpdate: 0,
            withdrawnAmount: 0,
            lastUpdateTime: block.timestamp,
            sentryNode: sentryNode,
            isPaused: false,
            isDisputed: false,
            isActive: true
        });

        emit StreamCreated(
            streamId,
            msg.sender,
            receivers,
            sharePercentages,
            token,
            deposit,
            ratePerSecond,
            block.timestamp,
            stopTime,
            sentryNode
        );

        return streamId;
    }

    /**
     * @notice Returns the total accrued amount of tokens since the stream started.
     */
    function getAccrued(uint256 streamId) public view returns (uint256) {
        Stream storage stream = streams[streamId];
        if (!stream.isActive) return 0;

        uint256 accrued = stream.accruedUntilLastUpdate;
        if (!stream.isPaused) {
            uint256 endTime = block.timestamp;
            if (endTime > stream.stopTime) {
                endTime = stream.stopTime;
            }
            if (endTime > stream.lastUpdateTime) {
                uint256 timePassed = endTime - stream.lastUpdateTime;
                accrued += timePassed * stream.ratePerSecond;
            }
        }

        if (accrued > stream.deposit) {
            accrued = stream.deposit;
        }

        return accrued;
    }

    /**
     * @notice Updates stream accrual internal state.
     */
    function _updateStream(uint256 streamId) internal {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream is not active");

        if (!stream.isPaused) {
            uint256 endTime = block.timestamp;
            if (endTime > stream.stopTime) {
                endTime = stream.stopTime;
            }
            if (endTime > stream.lastUpdateTime) {
                uint256 timePassed = endTime - stream.lastUpdateTime;
                uint256 accrued = timePassed * stream.ratePerSecond;
                stream.accruedUntilLastUpdate += accrued;

                if (stream.accruedUntilLastUpdate > stream.deposit) {
                    stream.accruedUntilLastUpdate = stream.deposit;
                }
            }
        }
        stream.lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Allows receiver/sender to withdraw accrued tokens from the stream.
     */
    function withdrawFromStream(uint256 streamId, uint256 amount) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(msg.sender == stream.sender || _isReceiver(streamId, msg.sender), "Not stream party");

        _updateStream(streamId);

        uint256 claimable = stream.accruedUntilLastUpdate - stream.withdrawnAmount;
        require(amount <= claimable, "Amount exceeds claimable balance");

        stream.withdrawnAmount += amount;
        stream.remainingBalance -= amount;

        // Withdraw from Yield Vault
        yieldVault.withdraw(stream.token, amount);

        // Process actual token transfers
        for (uint i = 0; i < stream.receivers.length; i++) {
            uint256 share = (amount * stream.sharePercentages[i]) / 100;
            if (share > 0) {
                IERC20(stream.token).safeTransfer(stream.receivers[i], share);
            }
        }

        emit StreamWithdrawn(streamId, msg.sender, amount);
    }

    /**
     * @notice Pauses the payment stream. Stop time calculation freezes.
     */
    function pauseStream(uint256 streamId) external onlyStreamParty(streamId) {
        Stream storage stream = streams[streamId];
        require(!stream.isPaused, "Stream is already paused");
        require(!stream.isDisputed, "Cannot pause a disputed stream manually");

        _updateStream(streamId);
        stream.isPaused = true;

        emit StreamPaused(streamId, msg.sender);
    }

    /**
     * @notice Resumes a paused stream. Adjusts the stop time accordingly.
     */
    function resumeStream(uint256 streamId) external onlyStreamParty(streamId) {
        Stream storage stream = streams[streamId];
        require(stream.isPaused, "Stream is not paused");
        require(!stream.isDisputed, "Cannot manually resume a disputed stream");

        stream.isPaused = false;
        stream.lastUpdateTime = block.timestamp;

        // Recalculate stop time based on remaining unaccrued balance
        uint256 unaccrued = stream.deposit - stream.accruedUntilLastUpdate;
        uint256 remainingDuration = unaccrued / stream.ratePerSecond;
        stream.stopTime = block.timestamp + remainingDuration;

        emit StreamResumed(streamId, msg.sender, stream.stopTime);
    }

    /**
     * @notice Adjusts the flow rate of the stream. Recalculates stop time.
     */
    function adjustStreamRate(uint256 streamId, uint256 newRatePerSecond) external onlyStreamSenderOrSentry(streamId) {
        require(newRatePerSecond > 0, "Rate must be greater than zero");
        _updateStream(streamId);

        Stream storage stream = streams[streamId];
        uint256 oldRate = stream.ratePerSecond;
        stream.ratePerSecond = newRatePerSecond;

        // Recalculate stop time based on remaining unaccrued balance and new rate
        uint256 unaccrued = stream.deposit - stream.accruedUntilLastUpdate;
        uint256 remainingDuration = unaccrued / newRatePerSecond;
        stream.stopTime = block.timestamp + remainingDuration;

        emit StreamAdjusted(streamId, msg.sender, oldRate, newRatePerSecond, stream.stopTime);
    }

    /**
     * @notice Tops up the deposit balance of the stream. Extends stop time.
     */
    function topUpStream(uint256 streamId, uint256 amount) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(msg.sender == stream.sender, "Only sender can top up");
        require(amount > 0, "Amount must be greater than zero");

        _updateStream(streamId);

        // Transfer top-up tokens
        IERC20(stream.token).safeTransferFrom(msg.sender, address(this), amount);

        // Deposit top-up into DeFi vault
        IERC20(stream.token).forceApprove(address(yieldVault), amount);
        yieldVault.deposit(stream.token, amount);

        stream.deposit += amount;
        stream.remainingBalance += amount;

        // Recalculate stop time
        uint256 unaccrued = stream.deposit - stream.accruedUntilLastUpdate;
        uint256 remainingDuration = unaccrued / stream.ratePerSecond;
        stream.stopTime = block.timestamp + remainingDuration;

        emit StreamToppedUp(streamId, msg.sender, amount, stream.stopTime);
    }

    /**
     * @notice Opens a dispute on the stream, freezing it for DAO resolution.
     */
    function disputeStream(uint256 streamId) external onlyStreamParty(streamId) {
        Stream storage stream = streams[streamId];
        require(!stream.isDisputed, "Already disputed");
        
        _updateStream(streamId);
        stream.isPaused = true;
        stream.isDisputed = true;

        emit StreamDisputed(streamId, msg.sender);
    }

    /**
     * @notice Resolved a dispute. Called by the DAO.
     */
    function resolveDispute(uint256 streamId, bool refundUser) external {
        require(msg.sender == address(daoContract), "Only DAO can resolve");
        Stream storage stream = streams[streamId];
        require(stream.isDisputed, "Not disputed");

        stream.isDisputed = false;
        
        if (refundUser) {
            _cancelInternal(streamId);
        } else {
            stream.isPaused = false;
            stream.lastUpdateTime = block.timestamp;
            uint256 unaccrued = stream.deposit - stream.accruedUntilLastUpdate;
            uint256 remainingDuration = unaccrued / stream.ratePerSecond;
            stream.stopTime = block.timestamp + remainingDuration;
            emit StreamResumed(streamId, msg.sender, stream.stopTime);
        }
        
        emit DisputeResolved(streamId, refundUser);
    }

    /**
     * @notice Internal logic for cancellation, shared between cancelStream and resolveDispute
     */
    function _cancelInternal(uint256 streamId) internal {
        Stream storage stream = streams[streamId];
        uint256 receiverAmount = stream.accruedUntilLastUpdate - stream.withdrawnAmount;
        uint256 senderAmount = stream.remainingBalance - receiverAmount;

        address sender = stream.sender;
        address token = stream.token;

        stream.isActive = false;
        stream.remainingBalance = 0;

        // Withdraw remaining balance from Yield Vault
        if (receiverAmount + senderAmount > 0) {
            yieldVault.withdraw(token, receiverAmount + senderAmount);
        }

        if (receiverAmount > 0) {
            // Split receiver amount among receivers
            for (uint i = 0; i < stream.receivers.length; i++) {
                uint256 share = (receiverAmount * stream.sharePercentages[i]) / 100;
                if (share > 0) {
                    IERC20(stream.token).safeTransfer(stream.receivers[i], share);
                }
            }
        }

        if (senderAmount > 0) {
            IERC20(stream.token).safeTransfer(sender, senderAmount);
        }

        // Mint Proof-of-Compute NFT to sender
        uint256 duration = stream.stopTime - stream.startTime;
        receiptNFT.mintReceipt(sender, streamId, stream.withdrawnAmount + receiverAmount, duration);

        emit StreamCancelled(streamId, receiverAmount, senderAmount);
    }

    /**
     * @notice Cancels the stream. Accrued balance is sent to receiver, remaining is refunded to sender.
     */
    function cancelStream(uint256 streamId) external nonReentrant onlyStreamParty(streamId) {
        require(!streams[streamId].isDisputed, "Cannot cancel a disputed stream directly");
        _updateStream(streamId);
        _cancelInternal(streamId);
    }
}
