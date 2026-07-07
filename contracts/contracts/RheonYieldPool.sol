// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RheonPriceOracle.sol";

contract RheonYieldPool {
    using SafeERC20 for IERC20;

    RheonPriceOracle public priceOracle;
    address public owner;

    // Total USDT deposited by lenders
    uint256 public totalDeposits;
    // Total USDT currently borrowed
    uint256 public totalBorrows;

    // Tracks deposits per user
    // user -> token -> amount
    mapping(address => mapping(address => uint256)) public userDeposits;

    // Borrow details struct
    struct BorrowReceipt {
        uint256 principal;
        uint256 collateral; // locked BOT (msg.value)
        uint256 borrowTime;
    }

    // borrower -> BorrowReceipt
    mapping(address => BorrowReceipt) public borrows;

    // Fixed interest rate: 10% APR (annual percentage rate)
    uint256 public constant INTEREST_RATE_APR = 10;
    // Seconds in a year
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed borrower, uint256 amount, uint256 collateral);
    event Repaid(address indexed borrower, uint256 principalRepaid, uint256 interestPaid);
    event Liquidated(address indexed borrower, address indexed liquidator, uint256 debtRepaid, uint256 collateralReleased);

    constructor(address oracleAddress) {
        owner = msg.sender;
        priceOracle = RheonPriceOracle(oracleAddress);
    }

    // Deposit USDT (lender view)
    function deposit(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userDeposits[msg.sender][token] += amount;
        totalDeposits += amount;
        emit Deposited(msg.sender, token, amount);
    }

    // Withdraw USDT (lender view)
    function withdraw(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(userDeposits[msg.sender][token] >= amount, "Insufficient vault balance");
        
        // Ensure pool has enough idle liquidity
        uint256 poolLiquidity = IERC20(token).balanceOf(address(this));
        require(poolLiquidity >= amount, "Insufficient pool liquidity; funds currently borrowed");

        userDeposits[msg.sender][token] -= amount;
        totalDeposits -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, token, amount);
    }

    // Borrow USDT (collateral in Native BOT tokens sent as msg.value)
    // 150% Collateralization Ratio (1.5x)
    function borrow(address token, uint256 usdtAmount) external payable {
        require(usdtAmount > 0, "USDT amount must be greater than zero");
        require(borrows[msg.sender].principal == 0, "Already have an active borrow");
        
        // Check pool liquidity
        uint256 poolLiquidity = IERC20(token).balanceOf(address(this));
        require(poolLiquidity >= usdtAmount, "Insufficient pool liquidity");

        // Calculate required collateral in BOT
        uint256 botPrice = priceOracle.botPrice();
        require(botPrice > 0, "Oracle price error");

        // BOT token has 18 decimals, USDT has 6 decimals
        // usdtAmount is in 6 decimals.
        // requiredCollateralValueUsdt (in 6 decimals) = usdtAmount * 150 / 100
        // requiredCollateralBot (in 18 decimals) = (requiredCollateralValueUsdt * 1e18) / botPrice
        uint256 requiredCollateralBot = (usdtAmount * 150 * 1e18) / (100 * botPrice);

        require(msg.value >= requiredCollateralBot, "Insufficient BOT collateral sent");

        // Set borrow receipt
        borrows[msg.sender] = BorrowReceipt({
            principal: usdtAmount,
            collateral: msg.value,
            borrowTime: block.timestamp
        });

        totalBorrows += usdtAmount;

        // Send USDT to borrower
        IERC20(token).safeTransfer(msg.sender, usdtAmount);

        emit Borrowed(msg.sender, usdtAmount, msg.value);
    }

    // Calculate current debt including accrued interest (10% APR simple interest)
    function getDebt(address borrower) public view returns (uint256) {
        BorrowReceipt storage b = borrows[borrower];
        if (b.principal == 0) return 0;

        uint256 timeElapsed = block.timestamp - b.borrowTime;
        // Simple interest: principal * APR * time_elapsed / seconds_per_year
        uint256 interest = (b.principal * INTEREST_RATE_APR * timeElapsed) / (100 * SECONDS_PER_YEAR);
        return b.principal + interest;
    }

    // Repay borrow
    function repay(address token, uint256 usdtAmount) external {
        BorrowReceipt storage b = borrows[msg.sender];
        require(b.principal > 0, "No active borrow");

        uint256 totalDebt = getDebt(msg.sender);
        require(usdtAmount >= totalDebt, "Must repay full debt to release collateral");

        // Transfer USDT to pool
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalDebt);

        uint256 interestPaid = totalDebt - b.principal;
        
        // Return BOT collateral
        uint256 collateral = b.collateral;
        totalBorrows -= b.principal;
        
        delete borrows[msg.sender];
        
        // Transfer native BOT back to borrower
        (bool success, ) = msg.sender.call{value: collateral}("");
        require(success, "Collateral transfer failed");

        emit Repaid(msg.sender, b.principal, interestPaid);
    }

    // Check if a borrower can be liquidated (collateral value drops below 120% of debt)
    function isLiquidatable(address borrower) public view returns (bool) {
        BorrowReceipt storage b = borrows[borrower];
        if (b.principal == 0) return false;

        uint256 debt = getDebt(borrower);
        uint256 botPrice = priceOracle.botPrice();
        if (botPrice == 0) return false;

        // Collateral value in USDT = (collateral * botPrice) / 1e18
        uint256 collateralValueUsdt = (b.collateral * botPrice) / 1e18;

        // Liquidation threshold is 120% (1.2x)
        // Liquidatable if collateralValueUsdt < debt * 1.2
        return collateralValueUsdt < (debt * 120) / 100;
    }

    // Liquidate undercollateralized loans
    function liquidate(address token, address borrower) external {
        require(isLiquidatable(borrower), "Borrower is not liquidatable");

        BorrowReceipt storage b = borrows[borrower];
        uint256 debt = getDebt(borrower);

        // Liquidator repays full USDT debt
        IERC20(token).safeTransferFrom(msg.sender, address(this), debt);

        uint256 collateral = b.collateral;
        totalBorrows -= b.principal;
        
        delete borrows[borrower];

        // Send BOT collateral to liquidator
        (bool success, ) = msg.sender.call{value: collateral}("");
        require(success, "Collateral transfer failed");

        emit Liquidated(borrower, msg.sender, debt, collateral);
    }
}
