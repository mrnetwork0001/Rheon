// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BotFlowReceipt is ERC721 {
    address public streamerContract;
    uint256 public nextTokenId = 1;

    struct ReceiptData {
        uint256 streamId;
        uint256 totalStreamed;
        uint256 duration;
    }

    mapping(uint256 => ReceiptData) public receipts;

    constructor(address _streamerContract) ERC721("BotFlow Compute Receipt", "BFR") {
        streamerContract = _streamerContract;
    }

    function mintReceipt(
        address to, 
        uint256 streamId, 
        uint256 totalStreamed, 
        uint256 duration
    ) external returns (uint256) {
        require(msg.sender == streamerContract, "Only streamer contract can mint");
        
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);

        receipts[tokenId] = ReceiptData({
            streamId: streamId,
            totalStreamed: totalStreamed,
            duration: duration
        });

        return tokenId;
    }
}
