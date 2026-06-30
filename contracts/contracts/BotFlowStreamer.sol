// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BotFlowStreamer is ReentrancyGuard {
    struct Stream {
        address sender;
        address receiver;
        address token;
        uint256 deposit; // Total tokens ever deposited (initial + topups)
        uint256 ratePerSecond; // Flow rate in tokens per second
        uint256 startTime;
        uint256 stopTime; // Timestamp when deposit runs out
        uint256 remainingBalance; // Balance currently locked in contract for this stream
        uint256 accruedUntilLastUpdate; // Total tokens accrued from start until last update
        uint256 withdrawnAmount; // Total tokens withdrawn by receiver
        uint256 lastUpdateTime;
        address sentryNode; // AI Sentry Node address that can monitor and pause/adjust this stream
        bool isPaused;
        bool isActive;
    }

    uint256 public nextStreamId = 1;
    mapping(uint256 => Stream) public streams;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed receiver,
        address token,
        uint256 deposit,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 stopTime,
        address sentryNode
    );
    event StreamWithdrawn(uint256 indexed streamId, address indexed receiver, uint256 amount);
    event StreamPaused(uint256 indexed streamId, address indexed by);
    event StreamResumed(uint256 indexed streamId, address indexed by, uint256 newStopTime);
    event StreamAdjusted(uint256 indexed streamId, address indexed by, uint256 oldRate, uint256 newRate, uint256 newStopTime);
    event StreamCancelled(uint256 indexed streamId, uint256 receiverAmount, uint256 senderAmount);
    event StreamToppedUp(uint256 indexed streamId, address indexed sender, uint256 amount, uint256 newStopTime);

    modifier onlyStreamParty(uint256 streamId) {
        Stream memory stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(
            msg.sender == stream.sender || 
            msg.sender == stream.receiver || 
            msg.sender == stream.sentryNode,
            "Not authorized"
        );
        _;
    }

    modifier onlyStreamSenderOrSentry(uint256 streamId) {
        Stream memory stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(
            msg.sender == stream.sender || 
            msg.sender == stream.sentryNode,
            "Not sender or sentry"
        );
        _;
    }

    /**
     * @notice Creates a new payment stream.
     * @param receiver The address receiving the tokens.
     * @param token The ERC20 token address.
     * @param deposit The amount of tokens to deposit.
     * @param ratePerSecond Flow rate of tokens per second.
     * @param sentryNode The AI Sentry Node address authorized to monitor/pause the stream.
     */
    function createStream(
        address receiver,
        address token,
        uint256 deposit,
        uint256 ratePerSecond,
        address sentryNode
    ) external nonReentrant returns (uint256) {
        require(receiver != address(0), "Receiver cannot be zero address");
        require(token != address(0), "Token cannot be zero address");
        require(deposit > 0, "Deposit must be greater than zero");
        require(ratePerSecond > 0, "Rate must be greater than zero");
        require(deposit >= ratePerSecond, "Deposit must be at least rate per second");

        // Transfer tokens to contract
        IERC20(token).transferFrom(msg.sender, address(this), deposit);

        uint256 duration = deposit / ratePerSecond;
        uint256 stopTime = block.timestamp + duration;
        uint256 streamId = nextStreamId++;

        streams[streamId] = Stream({
            sender: msg.sender,
            receiver: receiver,
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
            isActive: true
        });

        emit StreamCreated(
            streamId,
            msg.sender,
            receiver,
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
        Stream memory stream = streams[streamId];
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
     * @notice Allows receiver to withdraw accrued tokens from the stream.
     */
    function withdrawFromStream(uint256 streamId, uint256 amount) external nonReentrant {
        Stream memory stream = streams[streamId];
        require(stream.isActive, "Stream is not active");
        require(msg.sender == stream.receiver || msg.sender == stream.sender, "Not stream party");

        _updateStream(streamId);

        Stream storage streamRef = streams[streamId];
        uint256 claimable = streamRef.accruedUntilLastUpdate - streamRef.withdrawnAmount;
        require(amount <= claimable, "Amount exceeds claimable balance");

        streamRef.withdrawnAmount += amount;
        streamRef.remainingBalance -= amount;

        IERC20(streamRef.token).transfer(streamRef.receiver, amount);

        emit StreamWithdrawn(streamId, streamRef.receiver, amount);
    }

    /**
     * @notice Pauses the payment stream. Stop time calculation freezes.
     */
    function pauseStream(uint256 streamId) external onlyStreamParty(streamId) {
        Stream storage stream = streams[streamId];
        require(!stream.isPaused, "Stream is already paused");

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

        IERC20(stream.token).transferFrom(msg.sender, address(this), amount);

        stream.deposit += amount;
        stream.remainingBalance += amount;

        // Recalculate stop time
        uint256 unaccrued = stream.deposit - stream.accruedUntilLastUpdate;
        uint256 remainingDuration = unaccrued / stream.ratePerSecond;
        stream.stopTime = block.timestamp + remainingDuration;

        emit StreamToppedUp(streamId, msg.sender, amount, stream.stopTime);
    }

    /**
     * @notice Cancels the stream. Accrued balance is sent to receiver, remaining is refunded to sender.
     */
    function cancelStream(uint256 streamId) external nonReentrant onlyStreamParty(streamId) {
        _updateStream(streamId);

        Stream storage stream = streams[streamId];
        uint256 claimable = stream.accruedUntilLastUpdate - stream.withdrawnAmount;
        uint256 refund = stream.remainingBalance - claimable;

        address sender = stream.sender;
        address receiver = stream.receiver;
        address token = stream.token;

        stream.isActive = false;
        stream.remainingBalance = 0;

        if (claimable > 0) {
            IERC20(token).transfer(receiver, claimable);
        }
        if (refund > 0) {
            IERC20(token).transfer(sender, refund);
        }

        emit StreamCancelled(streamId, claimable, refund);
    }
}
