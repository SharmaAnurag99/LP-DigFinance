const hre = require("hardhat");
const fs = require("fs");

const REQUIRED_KEYS = [
  "SEPOLIA_RPC_URL",
  "VC_PRIVATE_KEY",
  "LP1_PRIVATE_KEY",
  "LP2_PRIVATE_KEY",
  "STARTUP_PRIVATE_KEY",
];

async function main() {
  console.log("🚀 Deploying to Testnet...\n");

  const missingKeys = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missingKeys.length > 0) {
    console.error(`❌ Missing environment variables: ${missingKeys.join(", ")}`);
    console.log(
      "\nSet them in .env (see README > Deployment) and re-run: npm run deploy:sepolia\n"
    );
    process.exit(1);
  }

  const [vcManager, lp1, lp2, startup] = await hre.ethers.getSigners();

  console.log("Primary accounts being used:");
  console.log(`   VC Manager (deployer): ${vcManager.address}`);
  console.log(`   LP #1:                 ${lp1.address}`);
  console.log(`   LP #2:                 ${lp2.address}`);
  console.log(`   Startup:               ${startup.address}`);

  const balance = await hre.ethers.provider.getBalance(vcManager.address);
  console.log("\nDeployer ETH balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance < hre.ethers.parseEther("0.05")) {
    console.warn(
      "⚠️  Deployer balance looks low. Ensure at least 0.05 ETH for a smooth deploy."
    );
  }

  // Deploy MockUSDC
  console.log("\n1️⃣  Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("   ✅ MockUSDC deployed to:", mockUSDCAddress);

  // Deploy FundFactory
  console.log("\n2️⃣  Deploying FundFactory...");
  const FundFactory = await hre.ethers.getContractFactory("FundFactory");
  const fundFactory = await FundFactory.deploy();
  await fundFactory.waitForDeployment();
  const fundFactoryAddress = await fundFactory.getAddress();
  console.log("   ✅ FundFactory deployed to:", fundFactoryAddress);

  // Distribute MockUSDC to LPs + Startup
  console.log("\n3️⃣  Distributing MockUSDC to LPs and Startup...");
  const allocations = [
    { label: "LP #1", address: lp1.address, amount: "100000" },
    { label: "LP #2", address: lp2.address, amount: "100000" },
    { label: "Startup", address: startup.address, amount: "50000" },
  ];

  for (const { label, address, amount } of allocations) {
    const parsed = hre.ethers.parseUnits(amount, 6);
    const tx = await mockUSDC.transfer(address, parsed);
    await tx.wait();
    console.log(`   ✅ Sent ${amount} mUSDC to ${label}: ${address}`);
  }

  const vcBalance = await mockUSDC.balanceOf(vcManager.address);
  console.log(
    `   ℹ️  VC Manager retains ${hre.ethers.formatUnits(vcBalance, 6)} mUSDC for operations`
  );

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  const networkName = hre.network.name;

  // Save addresses
  const addresses = {
    mockUSDC: mockUSDCAddress,
    fundFactory: fundFactoryAddress,
    network: networkName,
    chainId: network.chainId.toString(),
  };

  fs.writeFileSync(
    "./frontend/src/utils/contractAddresses.json",
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n=== Deployment Complete ===");
  console.log("\n📊 Contract Addresses:");
  console.log("   MockUSDC:", mockUSDCAddress);
  console.log("   FundFactory:", fundFactoryAddress);
  console.log("   Network:", networkName);
  console.log("   Chain ID:", network.chainId.toString());
  console.log("\n✅ Addresses saved to frontend/src/utils/contractAddresses.json");
  console.log("\n🎯 Next Steps:");
  console.log("   1. Ensure LP/Startup wallets have Sepolia ETH for gas (use faucet).");
  console.log("   2. Start frontend: cd frontend && npm run dev");
  console.log("   3. Connect MetaMask wallets (VC + LPs + Startup) and interact.");
  console.log("   4. Run scripts/setup-testnet-demo.js if you need seeded actions.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

