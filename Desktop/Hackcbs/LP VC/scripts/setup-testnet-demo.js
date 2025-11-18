const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Setting up complete testnet demo environment...\n");

  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable not set!");
    console.log("\nSet it with: export PRIVATE_KEY=your_private_key_here\n");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Step 1: Deploy MockUSDC
  console.log("1️⃣  Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("   ✅ MockUSDC deployed:", mockUSDCAddress);

  // Step 2: Deploy FundFactory
  console.log("\n2️⃣  Deploying FundFactory...");
  const FundFactory = await hre.ethers.getContractFactory("FundFactory");
  const fundFactory = await FundFactory.deploy();
  await fundFactory.waitForDeployment();
  const fundFactoryAddress = await fundFactory.getAddress();
  console.log("   ✅ FundFactory deployed:", fundFactoryAddress);

  // Step 3: Create demo fund
  console.log("\n3️⃣  Creating demo fund...");
  const tx = await fundFactory.createFund(mockUSDCAddress, 20);
  const receipt = await tx.wait();

  // Get fund address from event
  let fundCreatedEvent = null;
  for (const log of receipt.logs) {
    try {
      const parsed = fundFactory.interface.parseLog(log);
      if (parsed && parsed.name === "FundCreated") {
        fundCreatedEvent = parsed;
        break;
      }
    } catch (e) {
      // Continue searching
    }
  }

  let fundAddress, lpTokenAddress;
  if (fundCreatedEvent) {
    fundAddress = fundCreatedEvent.args.fundAddress;
    lpTokenAddress = fundCreatedEvent.args.lpTokenAddress;
  } else {
    const allFunds = await fundFactory.getAllFunds();
    fundAddress = allFunds[allFunds.length - 1];
    const Fund = await hre.ethers.getContractFactory("Fund");
    const tempFund = Fund.attach(fundAddress);
    lpTokenAddress = await tempFund.lpToken();
  }

  console.log("   ✅ Fund created:", fundAddress);
  console.log("   ✅ LP Token:", lpTokenAddress);

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

  console.log("\n=== Setup Complete ===");
  console.log("\n📊 Contract Addresses:");
  console.log("   MockUSDC:", mockUSDCAddress);
  console.log("   FundFactory:", fundFactoryAddress);
  console.log("   Demo Fund:", fundAddress);
  console.log("   LP Token:", lpTokenAddress);
  console.log("   Network:", networkName);
  console.log("   Chain ID:", network.chainId.toString());
  console.log("\n✅ Addresses saved to frontend/src/utils/contractAddresses.json");
  console.log("\n🎯 Next Steps:");
  console.log("   1. Make sure MetaMask is on", networkName, "network");
  console.log("   2. Start frontend: cd frontend && npm run dev");
  console.log("   3. Connect MetaMask and test!");
  console.log("\n💡 Note: You'll need to get MockUSDC tokens to test accounts manually");
  console.log("   or use the frontend to mint/transfer tokens.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

