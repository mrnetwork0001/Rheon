// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV2Router02 {
    function WETH() external pure returns (address);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
}

contract RheonSwapRouter {
    address public immutable bdexRouter;
    address public immutable wbot;

    event RheonSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _bdexRouter) {
        require(_bdexRouter != address(0), "Invalid router address");
        bdexRouter = _bdexRouter;
        wbot = IUniswapV2Router02(_bdexRouter).WETH();
    }

    function swapExactBOTForTokens(
        address tokenOut,
        uint amountOutMin,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = wbot;
        path[1] = tokenOut;

        amounts = IUniswapV2Router02(bdexRouter).swapExactETHForTokens{value: msg.value}(
            amountOutMin,
            path,
            to,
            deadline
        );

        emit RheonSwap(msg.sender, path[0], tokenOut, msg.value, amounts[1]);
    }

    function swapExactTokensForBOT(
        uint amountIn,
        uint amountOutMin,
        address tokenIn,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = wbot;

        // Pull user tokens
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");

        // Approve BDEX Router
        require(IERC20(tokenIn).approve(bdexRouter, amountIn), "Approval failed");

        amounts = IUniswapV2Router02(bdexRouter).swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );

        emit RheonSwap(msg.sender, tokenIn, path[1], amountIn, amounts[1]);
    }

    // Allow receiving native BOT
    receive() external payable {}
}
