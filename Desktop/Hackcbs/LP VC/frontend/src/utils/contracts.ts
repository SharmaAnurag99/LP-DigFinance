import { ethers } from 'ethers';
import contractAddresses from './contractAddresses.json';

// ABI for MockUSDC
export const MOCK_USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// ABI for FundToken
export const FUND_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

// ABI for Fund
export const FUND_ABI = [
  "function vcManager() view returns (address)",
  "function acceptedStablecoin() view returns (address)",
  "function lpToken() view returns (address)",
  "function totalDeposited() view returns (uint256)",
  "function totalInvested() view returns (uint256)",
  "function totalReturns() view returns (uint256)",
  "function carriedInterestPercent() view returns (uint256)",
  "function fundActive() view returns (bool)",
  "function lpContributions(address) view returns (uint256)",
  "function investments(address) view returns (uint256)",
  "function deposit(uint256 amount)",
  "function invest(address startup, uint256 amount, string description)",
  "function depositReturns(uint256 amount)",
  "function distributeReturns()",
  "function lpWithdraw(uint256 lpTokenAmount)",
  "function getFundStats() view returns (uint256, uint256, uint256, uint256, uint256, bool)",
  "function getLPShare(address lp) view returns (uint256)",
  "function getLPActivityCount(address lp) view returns (uint256)",
  "function getLPActivity(address lp, uint256 index) view returns (uint8 actionType, uint256 amount, uint256 lpTokens, uint256 timestamp)",
  "function getInvestmentCount() view returns (uint256)",
  "function getInvestment(uint256 index) view returns (address startup, uint256 amount, string description, uint256 timestamp)",
  "function getStartupInvestmentCount(address startup) view returns (uint256)",
  "function getStartupInvestment(address startup, uint256 index) view returns (address, uint256, string, uint256)",
  "function getReturnCount() view returns (uint256)",
  "function getReturnRecord(uint256 index) view returns (uint256 amount, uint256 timestamp)",
  "function getDistributionCount() view returns (uint256)",
  "function getDistributionRecord(uint256 index) view returns (uint256 lpReturns, uint256 vcCarry, uint256 timestamp)",
  "event Deposit(address indexed lp, uint256 amount, uint256 lpTokens)",
  "event InvestmentMade(address indexed startup, uint256 amount, string description)",
  "event ReturnsDeposited(uint256 amount)",
  "event ReturnsDistributed(uint256 lpReturns, uint256 vcCarry)",
  "event Withdrawal(address indexed lp, uint256 amount, uint256 lpTokensBurned)",
];

// ABI for FundFactory
export const FUND_FACTORY_ABI = [
  "function createFund(address stablecoinAddress, uint256 carriedInterestPercent) returns (address fundAddress, address lpTokenAddress)",
  "function getAllFunds() view returns (address[])",
  "function getVCFunds(address vc) view returns (address[])",
  "function getFundCount() view returns (uint256)",
  "function funds(uint256) view returns (address)",
  "event FundCreated(address indexed vcManager, address indexed fundAddress, address lpTokenAddress, uint256 carriedInterestPercent)",
];

export const getContractAddresses = () => contractAddresses;

export const getProvider = () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return null;
};

export const getSigner = async () => {
  const provider = getProvider();
  if (!provider) return null;
  return await provider.getSigner();
};

export const getMockUSDCContract = async () => {
  const signer = await getSigner();
  if (!signer || !contractAddresses.mockUSDC || contractAddresses.mockUSDC === '') return null;
  return new ethers.Contract(contractAddresses.mockUSDC, MOCK_USDC_ABI, signer);
};

export const getFundFactoryContract = async () => {
  const provider = getProvider();
  if (!provider || !contractAddresses.fundFactory || contractAddresses.fundFactory === '') return null;
  
  // Check network first
  try {
    const network = await provider.getNetwork();
    const expectedChainId = BigInt(contractAddresses.chainId || '1337');
    console.log(`Current network: Chain ID ${network.chainId}, Expected: ${expectedChainId}`);
    if (network.chainId !== expectedChainId) {
      console.warn(`❌ Network mismatch! Connected to Chain ID ${network.chainId}, but expected ${expectedChainId}. Please switch MetaMask to Hardhat Local network.`);
      return null;
    }
    console.log('✅ Network matches!');
  } catch (error) {
    console.warn('Error checking network:', error);
    return null;
  }
  
  // Check if contract exists at address
  try {
    const code = await provider.getCode(contractAddresses.fundFactory);
    if (code === '0x' || code === '0x0') {
      console.warn('No contract found at FundFactory address:', contractAddresses.fundFactory);
      console.warn('This usually means:');
      console.warn('1. Contracts were not deployed - run "npm run setup:demo"');
      console.warn('2. Hardhat node was restarted - redeploy contracts');
      console.warn('3. MetaMask is on wrong network - switch to Hardhat Local (Chain ID 1337)');
      return null;
    }
  } catch (error) {
    console.warn('Error checking contract code:', error);
    return null;
  }
  
  const signer = await getSigner();
  if (!signer) return null;
  return new ethers.Contract(contractAddresses.fundFactory, FUND_FACTORY_ABI, signer);
};

export const getFundContract = async (fundAddress: string) => {
  const signer = await getSigner();
  if (!signer) return null;
  return new ethers.Contract(fundAddress, FUND_ABI, signer);
};

export const getFundTokenContract = async (tokenAddress: string) => {
  const signer = await getSigner();
  if (!signer) return null;
  return new ethers.Contract(tokenAddress, FUND_TOKEN_ABI, signer);
};

export const formatTokenAmount = (amount: bigint, decimals: number = 6) => {
  return ethers.formatUnits(amount, decimals);
};

export const parseTokenAmount = (amount: string, decimals: number = 6) => {
  return ethers.parseUnits(amount, decimals);
};

export interface FundMetrics {
  totalDeposited: string;
  totalInvested: string;
  totalReturns: string;
  contractBalance: string;
  lpTokenSupply: string;
  fundActive: boolean;
}

export interface FundSnapshot {
  fundAddress: string;
  vcManager: string;
  lpTokenAddress: string;
  stats: FundMetrics;
}

export type LPActivityType = "deposit" | "withdrawal";

export interface LPActivityEntry {
  fundAddress: string;
  actionType: LPActivityType;
  amount: string;
  lpTokens: string;
  timestamp: number;
}

export interface InvestmentEntry {
  fundAddress: string;
  startup: string;
  amount: string;
  description: string;
  timestamp: number;
}

export interface ReturnEntry {
  fundAddress: string;
  amount: string;
  timestamp: number;
}

export interface DistributionEntry {
  fundAddress: string;
  lpReturns: string;
  vcCarry: string;
  timestamp: number;
}

export const getFundSnapshot = async (fundAddress: string): Promise<FundSnapshot | null> => {
  const fundContract = await getFundContract(fundAddress);
  if (!fundContract) return null;

  const [fundStats, vcManager, lpTokenAddress] = await Promise.all([
    fundContract.getFundStats(),
    fundContract.vcManager(),
    fundContract.lpToken(),
  ]);

  const stats: FundMetrics = {
    totalDeposited: formatTokenAmount(fundStats[0], 6),
    totalInvested: formatTokenAmount(fundStats[1], 6),
    totalReturns: formatTokenAmount(fundStats[2], 6),
    contractBalance: formatTokenAmount(fundStats[3], 6),
    lpTokenSupply: formatTokenAmount(fundStats[4], 18),
    fundActive: fundStats[5],
  };

  return {
    fundAddress,
    vcManager,
    lpTokenAddress,
    stats,
  };
};

const mapLpAction = (value: bigint): LPActivityType => {
  return Number(value) === 0 ? "deposit" : "withdrawal";
};

export const getLPActivitiesForFund = async (
  fundAddress: string,
  lpAddress: string
): Promise<LPActivityEntry[]> => {
  if (!lpAddress) return [];
  const fundContract = await getFundContract(fundAddress);
  if (!fundContract) return [];

  const activityCount = Number(await fundContract.getLPActivityCount(lpAddress));
  const activities: LPActivityEntry[] = [];

  for (let i = 0; i < activityCount; i++) {
    const activity = await fundContract.getLPActivity(lpAddress, i);
    activities.push({
      fundAddress,
      actionType: mapLpAction(activity[0]),
      amount: formatTokenAmount(activity[1], 6),
      lpTokens: formatTokenAmount(activity[2], 18),
      timestamp: Number(activity[3]),
    });
  }

  return activities;
};

export const getInvestmentHistoryForFund = async (
  fundAddress: string
): Promise<InvestmentEntry[]> => {
  const fundContract = await getFundContract(fundAddress);
  if (!fundContract) return [];

  const count = Number(await fundContract.getInvestmentCount());
  const investments: InvestmentEntry[] = [];

  for (let i = 0; i < count; i++) {
    const investment = await fundContract.getInvestment(i);
    investments.push({
      fundAddress,
      startup: investment[0],
      amount: formatTokenAmount(investment[1], 6),
      description: investment[2],
      timestamp: Number(investment[3]),
    });
  }

  return investments;
};

export const getStartupInvestmentsForFund = async (
  fundAddress: string,
  startupAddress: string
): Promise<InvestmentEntry[]> => {
  if (!startupAddress) return [];
  const fundContract = await getFundContract(fundAddress);
  if (!fundContract) return [];

  const count = Number(await fundContract.getStartupInvestmentCount(startupAddress));
  const investments: InvestmentEntry[] = [];

  for (let i = 0; i < count; i++) {
    const investment = await fundContract.getStartupInvestment(startupAddress, i);
    investments.push({
      fundAddress,
      startup: investment[0],
      amount: formatTokenAmount(investment[1], 6),
      description: investment[2],
      timestamp: Number(investment[3]),
    });
  }

  return investments;
};

export const getReturnHistoryForFund = async (
  fundAddress: string
): Promise<ReturnEntry[]> => {
  const fundContract = await getFundContract(fundAddress);
  if (!fundContract) return [];

  const count = Number(await fundContract.getReturnCount());
  const records: ReturnEntry[] = [];

  for (let i = 0; i < count; i++) {
    const record = await fundContract.getReturnRecord(i);
    records.push({
      fundAddress,
      amount: formatTokenAmount(record[0], 6),
      timestamp: Number(record[1]),
    });
  }

  return records;
};

export const getDistributionHistoryForFund = async (
  fundAddress: string
): Promise<DistributionEntry[]> => {
  const fundContract = await getFundContract(fundAddress);
  if (!fundContract) return [];

  const count = Number(await fundContract.getDistributionCount());
  const records: DistributionEntry[] = [];

  for (let i = 0; i < count; i++) {
    const record = await fundContract.getDistributionRecord(i);
    records.push({
      fundAddress,
      lpReturns: formatTokenAmount(record[0], 6),
      vcCarry: formatTokenAmount(record[1], 6),
      timestamp: Number(record[2]),
    });
  }

  return records;
};

