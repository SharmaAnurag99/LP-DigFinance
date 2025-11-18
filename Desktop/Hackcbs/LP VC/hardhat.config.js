require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const {
  SEPOLIA_RPC_URL,
  GOERLI_RPC_URL,
  PRIVATE_KEY,
  VC_PRIVATE_KEY,
  LP1_PRIVATE_KEY,
  LP2_PRIVATE_KEY,
  STARTUP_PRIVATE_KEY,
} = process.env;

const normalizeKey = (key) => {
  if (!key) return undefined;
  return key.startsWith("0x") ? key : `0x${key}`;
};

const sharedAccounts = [
  normalizeKey(VC_PRIVATE_KEY),
  normalizeKey(LP1_PRIVATE_KEY),
  normalizeKey(LP2_PRIVATE_KEY),
  normalizeKey(STARTUP_PRIVATE_KEY),
].filter(Boolean);

const fallbackAccounts = PRIVATE_KEY ? [normalizeKey(PRIVATE_KEY)] : [];

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID",
      accounts: sharedAccounts.length > 0 ? sharedAccounts : fallbackAccounts,
      chainId: 11155111,
      timeout: 120000, // 120 seconds
      gasPrice: "auto",
    },
    goerli: {
      url: GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID",
      accounts: sharedAccounts.length > 0 ? sharedAccounts : fallbackAccounts,
      chainId: 5,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

module.exports = config;

