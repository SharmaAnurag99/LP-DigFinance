// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FundToken.sol";

error InvalidStablecoin();
error InvalidLPToken();
error InvalidVCManager();
error FundNotActive();
error AmountZero();
error StartupZeroAddress();
error Unauthorized();
error InsufficientBalance();
error NoReturnsAvailable();
error InvalidIndex();
error InsufficientLPTokens();
error CarryPercentTooHigh();

contract Fund is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum LPActionType {
        Deposit,
        Withdrawal
    }

    struct LPActivity {
        LPActionType actionType;
        uint256 amount;
        uint256 lpTokens;
        uint256 timestamp;
    }

    struct InvestmentRecord {
        address startup;
        uint256 amount;
        string description;
        uint256 timestamp;
    }

    struct ReturnRecord {
        uint256 amount;
        uint256 timestamp;
    }

    struct DistributionRecord {
        uint256 lpReturns;
        uint256 vcCarry;
        uint256 timestamp;
    }

    address public immutable vcManager;
    IERC20 public immutable acceptedStablecoin;
    FundToken public immutable lpToken;
    
    uint256 public totalDeposited;
    uint256 public totalInvested;
    uint256 public totalReturns;
    uint256 public carriedInterestPercent;
    bool public fundActive;
    
    mapping(address => uint256) public lpContributions;
    mapping(address => uint256) public investments;
    mapping(address => LPActivity[]) private lpActivities;
    InvestmentRecord[] private investmentHistory;
    mapping(address => uint256[]) private startupInvestmentIndexes;
    ReturnRecord[] private returnHistory;
    DistributionRecord[] private distributionHistory;
    
    event Deposit(address indexed lp, uint256 amount, uint256 lpTokens);
    event InvestmentMade(address indexed startup, uint256 amount, string description);
    event ReturnsDeposited(uint256 amount);
    event ReturnsDistributed(uint256 lpReturns, uint256 vcCarry);
    event Withdrawal(address indexed lp, uint256 amount, uint256 lpTokensBurned);

    uint256 private constant MAX_CARRY_PERCENT = 100;

    modifier onlyVCManager() {
        if (msg.sender != vcManager) revert Unauthorized();
        _;
    }

    modifier whenActive() {
        if (!fundActive) revert FundNotActive();
        _;
    }

    constructor(
        address _stablecoinAddress,
        address _lpTokenAddress,
        uint256 _carriedInterestPercent,
        address _vcManager
    ) {
        if (_stablecoinAddress == address(0)) revert InvalidStablecoin();
        if (_lpTokenAddress == address(0)) revert InvalidLPToken();
        if (_vcManager == address(0)) revert InvalidVCManager();
        if (_carriedInterestPercent > MAX_CARRY_PERCENT) revert CarryPercentTooHigh();
        
        vcManager = _vcManager;
        acceptedStablecoin = IERC20(_stablecoinAddress);
        lpToken = FundToken(_lpTokenAddress);
        carriedInterestPercent = _carriedInterestPercent;
        fundActive = true;
    }

    function deposit(uint256 _amount) external nonReentrant whenActive {
        if (_amount == 0) revert AmountZero();
        
        acceptedStablecoin.safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 lpTokensToMint;
        if (totalDeposited == 0) {
            // First deposit: 1:1 ratio
            lpTokensToMint = _amount;
        } else {
            // Calculate LP tokens based on current total supply and total deposited
            uint256 currentLpSupply = lpToken.totalSupply();
            lpTokensToMint = (_amount * currentLpSupply) / totalDeposited;
        }
        
        unchecked {
            lpContributions[msg.sender] += _amount;
            totalDeposited += _amount;
        }
        
        lpToken.mint(msg.sender, lpTokensToMint);

        lpActivities[msg.sender].push(
            LPActivity({
                actionType: LPActionType.Deposit,
                amount: _amount,
                lpTokens: lpTokensToMint,
                timestamp: block.timestamp
            })
        );
        
        emit Deposit(msg.sender, _amount, lpTokensToMint);
    }

    function invest(
        address _startup,
        uint256 _amount,
        string calldata _description
    ) external nonReentrant onlyVCManager whenActive {
        if (_amount == 0) revert AmountZero();
        if (_startup == address(0)) revert StartupZeroAddress();
        
        uint256 contractBalance = acceptedStablecoin.balanceOf(address(this));
        if (_amount > contractBalance) revert InsufficientBalance();
        
        acceptedStablecoin.safeTransfer(_startup, _amount);
        unchecked {
            investments[_startup] += _amount;
            totalInvested += _amount;
        }

        investmentHistory.push(
            InvestmentRecord({
                startup: _startup,
                amount: _amount,
                description: _description,
                timestamp: block.timestamp
            })
        );
        startupInvestmentIndexes[_startup].push(investmentHistory.length - 1);
        
        emit InvestmentMade(_startup, _amount, _description);
    }

    function depositReturns(uint256 _amount) external nonReentrant onlyVCManager {
        if (_amount == 0) revert AmountZero();
        
        acceptedStablecoin.safeTransferFrom(msg.sender, address(this), _amount);
        unchecked {
            totalReturns += _amount;
        }

        returnHistory.push(
            ReturnRecord({amount: _amount, timestamp: block.timestamp})
        );
        
        emit ReturnsDeposited(_amount);
    }

    function distributeReturns() external nonReentrant onlyVCManager {
        if (totalReturns == 0) revert NoReturnsAvailable();
        
        uint256 contractBalance = acceptedStablecoin.balanceOf(address(this));
        if (contractBalance < totalReturns) revert InsufficientBalance();
        
        // Calculate profits (returns minus invested amount)
        uint256 profits = totalReturns > totalInvested ? totalReturns - totalInvested : 0;
        uint256 vcCarry = 0;
        uint256 lpReturns = totalReturns;
        
        // Calculate VC carried interest on profits only
        if (profits > 0 && carriedInterestPercent > 0) {
            vcCarry = (profits * carriedInterestPercent) / 100;
            lpReturns = totalReturns - vcCarry;
        }
        
        // Transfer VC carry to manager
        if (vcCarry > 0) {
            acceptedStablecoin.safeTransfer(vcManager, vcCarry);
        }
        
        // LPs can withdraw their proportional share of the remaining balance
        // (which includes their share of returns) using lpWithdraw function
        // Reset totalReturns tracking after VC carry is extracted
        totalReturns = 0;

        distributionHistory.push(
            DistributionRecord({
                lpReturns: lpReturns,
                vcCarry: vcCarry,
                timestamp: block.timestamp
            })
        );
        
        emit ReturnsDistributed(lpReturns, vcCarry);
    }

    function lpWithdraw(uint256 _lpTokenAmount) external nonReentrant {
        if (_lpTokenAmount == 0) revert AmountZero();
        if (totalDeposited == 0) revert InsufficientBalance();
        
        uint256 lpTokenBalance = lpToken.balanceOf(msg.sender);
        if (_lpTokenAmount > lpTokenBalance) revert InsufficientLPTokens();
        
        uint256 lpTokenSupply = lpToken.totalSupply();
        if (lpTokenSupply == 0) revert InsufficientLPTokens();
        
        uint256 contractBalance = acceptedStablecoin.balanceOf(address(this));
        uint256 userShare = (contractBalance * _lpTokenAmount) / lpTokenSupply;
        
        if (userShare == 0 || userShare > contractBalance) revert InsufficientBalance();
        
        // Update state before transfer
        uint256 contributionToReduce = (userShare * totalDeposited) / contractBalance;
        if (contributionToReduce > lpContributions[msg.sender]) {
            contributionToReduce = lpContributions[msg.sender];
        }
        
        unchecked {
            lpContributions[msg.sender] -= contributionToReduce;
            totalDeposited -= contributionToReduce;
        }
        
        // Burn LP tokens
        lpToken.burn(msg.sender, _lpTokenAmount);
        
        // Transfer funds
        acceptedStablecoin.safeTransfer(msg.sender, userShare);
        
        lpActivities[msg.sender].push(
            LPActivity({
                actionType: LPActionType.Withdrawal,
                amount: userShare,
                lpTokens: _lpTokenAmount,
                timestamp: block.timestamp
            })
        );

        emit Withdrawal(msg.sender, userShare, _lpTokenAmount);
    }

    function getFundStats() external view returns (
        uint256 _totalDeposited,
        uint256 _totalInvested,
        uint256 _totalReturns,
        uint256 _contractBalance,
        uint256 _lpTokenSupply,
        bool _fundActive
    ) {
        return (
            totalDeposited,
            totalInvested,
            totalReturns,
            acceptedStablecoin.balanceOf(address(this)),
            lpToken.totalSupply(),
            fundActive
        );
    }

    function getLPShare(address _lp) external view returns (uint256) {
        uint256 lpTokenBalance = lpToken.balanceOf(_lp);
        uint256 lpTokenSupply = lpToken.totalSupply();
        if (lpTokenSupply == 0) return 0;
        
        uint256 contractBalance = acceptedStablecoin.balanceOf(address(this));
        return (contractBalance * lpTokenBalance) / lpTokenSupply;
    }

    function getLPActivityCount(address _lp) external view returns (uint256) {
        return lpActivities[_lp].length;
    }

    function getLPActivity(address _lp, uint256 _index) external view returns (LPActionType, uint256, uint256, uint256) {
        if (_index >= lpActivities[_lp].length) revert InvalidIndex();
        LPActivity memory activity = lpActivities[_lp][_index];
        return (activity.actionType, activity.amount, activity.lpTokens, activity.timestamp);
    }

    function getInvestmentCount() external view returns (uint256) {
        return investmentHistory.length;
    }

    function getInvestment(uint256 _index) external view returns (address, uint256, string memory, uint256) {
        if (_index >= investmentHistory.length) revert InvalidIndex();
        InvestmentRecord memory record = investmentHistory[_index];
        return (record.startup, record.amount, record.description, record.timestamp);
    }

    function getStartupInvestmentCount(address _startup) external view returns (uint256) {
        return startupInvestmentIndexes[_startup].length;
    }

    function getStartupInvestment(address _startup, uint256 _index) external view returns (address, uint256, string memory, uint256) {
        if (_index >= startupInvestmentIndexes[_startup].length) revert InvalidIndex();
        uint256 investmentIndex = startupInvestmentIndexes[_startup][_index];
        InvestmentRecord memory record = investmentHistory[investmentIndex];
        return (record.startup, record.amount, record.description, record.timestamp);
    }

    function getReturnCount() external view returns (uint256) {
        return returnHistory.length;
    }

    function getReturnRecord(uint256 _index) external view returns (uint256, uint256) {
        if (_index >= returnHistory.length) revert InvalidIndex();
        ReturnRecord memory record = returnHistory[_index];
        return (record.amount, record.timestamp);
    }

    function getDistributionCount() external view returns (uint256) {
        return distributionHistory.length;
    }

    function getDistributionRecord(uint256 _index) external view returns (uint256, uint256, uint256) {
        if (_index >= distributionHistory.length) revert InvalidIndex();
        DistributionRecord memory record = distributionHistory[_index];
        return (record.lpReturns, record.vcCarry, record.timestamp);
    }
}

