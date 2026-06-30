// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MockBDEX is ReentrancyGuard {
    IERC20 public usdtToken;
    
    // Swap rate: how many USDT (6 decimals) per 1 BOT (18 decimals).
    // E.g., if rate is 2, 1 BOT = 2 USDT.
    uint256 public rate = 2; 

    event SwapBOTForUSDT(address indexed user, uint256 botAmount, uint256 usdtAmount);
    event SwapUSDTForBOT(address indexed user, uint256 usdtAmount, uint256 botAmount);

    constructor(address _usdtToken) payable {
        usdtToken = _usdtToken;
    }

    // Allow the contract to receive native BOT tokens
    receive() external payable {}

    /**
     * @notice Swaps native BOT sent with transaction to USDT.
     */
    function swapBOTForUSDT() external payable nonReentrant {
        require(msg.value > 0, "Must send BOT to swap");
        
        // Calculate USDT: msg.value is in 18 decimals, USDT is in 6 decimals.
        // E.g. 1 BOT = 10^18. (10^18 * 2) / 10^12 = 2 * 10^6 (2 USDT).
        uint256 usdtAmount = (msg.value * rate) / 10**12;
        
        require(usdtToken.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT liquidity");
        
        usdtToken.transfer(msg.sender, usdtAmount);
        
        emit SwapBOTForUSDT(msg.sender, msg.value, usdtAmount);
    }

    /**
     * @notice Swaps USDT to native BOT.
     * @param usdtAmount The amount of USDT to swap (in 6 decimals).
     */
    function swapUSDTForBOT(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "Must swap more than zero");
        
        // Calculate BOT: (usdtAmount * 10^12) / rate.
        // E.g. 2 USDT (2 * 10^6) * 10^12 / 2 = 10^18 BOT (1 BOT).
        uint256 botAmount = (usdtAmount * 10**12) / rate;
        
        require(address(this).balance >= botAmount, "Insufficient BOT liquidity");
        
        // Pull USDT
        usdtToken.transferFrom(msg.sender, address(this), usdtAmount);
        
        // Transfer BOT
        (bool success, ) = msg.sender.call{value: botAmount}("");
        require(success, "BOT transfer failed");
        
        emit SwapUSDTForBOT(msg.sender, usdtAmount, botAmount);
    }

    /**
     * @notice Update swap rate (owner only or admin, simplified for MVP).
     */
    function setRate(uint256 _newRate) external {
        rate = _newRate;
    }
}
