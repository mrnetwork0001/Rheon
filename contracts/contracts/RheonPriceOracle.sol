// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RheonPriceOracle {
    address public owner;
    // Price of 1 BOT in USDT units (6 decimals). E.g. $1.00 = 1,000,000
    uint256 public botPrice;

    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 initialPrice) {
        owner = msg.sender;
        botPrice = initialPrice;
    }

    function updatePrice(uint256 newPrice) external onlyOwner {
        botPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
}
