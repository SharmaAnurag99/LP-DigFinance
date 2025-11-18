// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Fund.sol";
import "./FundToken.sol";

contract FundFactory {
    error FactoryInvalidStablecoin();
    error FactoryCarryPercentTooHigh();

    address public protocolAdmin;
    Fund[] public funds;
    mapping(address => Fund[]) public vcFunds;
    uint256 private constant MAX_CARRY_PERCENT = 100;
    
    event FundCreated(
        address indexed vcManager,
        address indexed fundAddress,
        address lpTokenAddress,
        uint256 carriedInterestPercent
    );

    constructor() {
        protocolAdmin = msg.sender;
    }

    function createFund(
        address _stablecoinAddress,
        uint256 _carriedInterestPercent
    ) external returns (address fundAddress, address lpTokenAddress) {
        if (_stablecoinAddress == address(0)) revert FactoryInvalidStablecoin();
        if (_carriedInterestPercent > MAX_CARRY_PERCENT) revert FactoryCarryPercentTooHigh();
        
        uint256 nextFundId = funds.length + 1;
        string memory fundIdStr = toString(nextFundId);
        // Create LP Token
        string memory tokenName = string(abi.encodePacked("Fund LP Token ", fundIdStr));
        string memory tokenSymbol = string(abi.encodePacked("FLP", fundIdStr));
        FundToken lpToken = new FundToken(tokenName, tokenSymbol);
        
        // Create Fund (pass msg.sender as VC manager)
        Fund newFund = new Fund(_stablecoinAddress, address(lpToken), _carriedInterestPercent, msg.sender);
        
        funds.push(newFund);
        vcFunds[msg.sender].push(newFund);
        
        // Transfer LP Token ownership to Fund (after internal state updates)
        // slither-disable-next-line reentrancy-no-eth
        lpToken.transferOwnership(address(newFund));
        
        emit FundCreated(msg.sender, address(newFund), address(lpToken), _carriedInterestPercent);
        
        return (address(newFund), address(lpToken));
    }

    function getAllFunds() external view returns (address[] memory) {
        address[] memory fundAddresses = new address[](funds.length);
        for (uint256 i = 0; i < funds.length; i++) {
            fundAddresses[i] = address(funds[i]);
        }
        return fundAddresses;
    }

    function getVCFunds(address _vc) external view returns (address[] memory) {
        Fund[] memory vcFundsList = vcFunds[_vc];
        address[] memory fundAddresses = new address[](vcFundsList.length);
        for (uint256 i = 0; i < vcFundsList.length; i++) {
            fundAddresses[i] = address(vcFundsList[i]);
        }
        return fundAddresses;
    }

    function getFundCount() external view returns (uint256) {
        return funds.length;
    }

    // Helper function to convert uint to string
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

