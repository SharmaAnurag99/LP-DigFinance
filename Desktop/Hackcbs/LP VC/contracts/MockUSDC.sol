// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private constant _decimals = 6;

    constructor() ERC20("MockUSDC", "mUSDC") {
        // Mint 1,000,000 tokens (with 6 decimals) to deployer
        uint256 amount = 1_000_000 * 10**_decimals;
        _mint(msg.sender, amount);
    }

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }
}

