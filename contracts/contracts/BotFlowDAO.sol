// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBotFlowStreamer {
    function resolveDispute(uint256 streamId, bool refundUser) external;
}

contract BotFlowDAO {
    IBotFlowStreamer public streamer;

    struct Dispute {
        uint256 yesVotes;
        uint256 noVotes;
        bool resolved;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Dispute) public disputes;

    event Voted(uint256 indexed streamId, address indexed voter, bool refundUser);
    event DisputeResolved(uint256 indexed streamId, bool refundUser);

    constructor(address _streamer) {
        streamer = IBotFlowStreamer(_streamer);
    }

    function vote(uint256 streamId, bool refundUser) external {
        require(!disputes[streamId].hasVoted[msg.sender], "Already voted");
        require(!disputes[streamId].resolved, "Already resolved");
        
        disputes[streamId].hasVoted[msg.sender] = true;
        if (refundUser) {
            disputes[streamId].yesVotes++;
        } else {
            disputes[streamId].noVotes++;
        }
        
        emit Voted(streamId, msg.sender, refundUser);
    }

    function executeResolution(uint256 streamId) external {
        require(!disputes[streamId].resolved, "Already resolved");
        Dispute storage d = disputes[streamId];
        
        // Quorum for hackathon purposes is just 1 vote
        require(d.yesVotes + d.noVotes >= 1, "Quorum not reached"); 
        
        d.resolved = true;
        bool refundUser = d.yesVotes >= d.noVotes; // tie goes to refund
        
        emit DisputeResolved(streamId, refundUser);
        streamer.resolveDispute(streamId, refundUser);
    }
}
