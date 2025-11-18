// Known account addresses from Hardhat/Testnet setup
// These are the deterministic addresses from the private keys used in setup scripts
// Also includes Hardhat default accounts (from mnemonic: "test test test test test test test test test test test junk")

export const KNOWN_ADDRESSES = {
  // From private keys (used in testnet setup)
  VC_MANAGER: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account 1
  LP_1: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account 2
  LP_2: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account 3
  STARTUP: '0x6bA4C8d19eeFB50EBa3950e318542969BE11f7D9', // Account 4
  
  // Hardhat default accounts (for local testing)
  HARDHAT_ACCOUNT_0: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Deployer
  HARDHAT_ACCOUNT_1: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Same as VC_MANAGER
  HARDHAT_ACCOUNT_2: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Same as LP_1
  HARDHAT_ACCOUNT_3: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Same as LP_2
  HARDHAT_ACCOUNT_4: '0x6bA4C8d19eeFB50EBa3950e318542969BE11f7D9', // Same as STARTUP
  HARDHAT_ACCOUNT_5: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Additional account (might be used as startup)
} as const;

export type RoleType = 'vc' | 'lp' | 'startup' | 'guest';

/**
 * Automatically detect user role based on their wallet address
 * Uses known addresses from Hardhat/Testnet setup
 */
export const detectRoleByAddress = (address: string | null | undefined): RoleType => {
  if (!address) return 'guest';
  
  const normalizedAddress = address.toLowerCase();
  const vcAddress = KNOWN_ADDRESSES.VC_MANAGER.toLowerCase();
  const lp1Address = KNOWN_ADDRESSES.LP_1.toLowerCase();
  const lp2Address = KNOWN_ADDRESSES.LP_2.toLowerCase();
  const startupAddress = KNOWN_ADDRESSES.STARTUP.toLowerCase();
  const hardhatAccount5 = KNOWN_ADDRESSES.HARDHAT_ACCOUNT_5.toLowerCase();
  
  console.log('🔍 Comparing addresses:', {
    input: normalizedAddress,
    vc: vcAddress,
    lp1: lp1Address,
    lp2: lp2Address,
    startup: startupAddress,
    hardhat5: hardhatAccount5,
    matchesVC: normalizedAddress === vcAddress,
    matchesLP1: normalizedAddress === lp1Address,
    matchesLP2: normalizedAddress === lp2Address,
    matchesStartup: normalizedAddress === startupAddress,
    matchesHardhat5: normalizedAddress === hardhatAccount5,
  });
  
  if (normalizedAddress === vcAddress) {
    return 'vc';
  }
  
  if (normalizedAddress === lp1Address || normalizedAddress === lp2Address) {
    return 'lp';
  }
  
  // Check both startup addresses (Account 4 and Account 5 from Hardhat)
  if (normalizedAddress === startupAddress || normalizedAddress === hardhatAccount5) {
    return 'startup';
  }
  
  return 'guest';
};

/**
 * Check if address is a known VC Manager
 */
export const isVCManagerAddress = (address: string | null | undefined): boolean => {
  if (!address) return false;
  return address.toLowerCase() === KNOWN_ADDRESSES.VC_MANAGER.toLowerCase();
};

