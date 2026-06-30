// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 6; // USDT standard is 6 decimals
    }

    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
