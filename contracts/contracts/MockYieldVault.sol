// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockYieldVault {
    using SafeERC20 for IERC20;

    // mapping of user -> token -> amount
    mapping(address => mapping(address => uint256)) public userDeposits;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);

    function deposit(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userDeposits[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(userDeposits[msg.sender][token] >= amount, "Insufficient vault balance");
        
        userDeposits[msg.sender][token] -= amount;
        
        // Simulate a tiny 0.1% DeFi yield bonus (requires vault to have excess liquidity, skipping for pure demo safety)
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }
}
