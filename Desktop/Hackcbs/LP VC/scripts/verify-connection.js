const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying Contract-Frontend Connection...\n");

  // Check if contractAddresses.json exists
  const addressesPath = path.join(__dirname, "../frontend/src/utils/contractAddresses.json");
  
  if (!fs.existsSync(addressesPath)) {
    console.log("❌ contractAddresses.json not found!");
    console.log("   Run 'npm run deploy' first to deploy contracts.\n");
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  console.log("📋 Contract Addresses:");
  console.log("   MockUSDC:", addresses.mockUSDC || "❌ NOT SET");
  console.log("   FundFactory:", addresses.fundFactory || "❌ NOT SET");
  console.log("   Network:", addresses.network || "unknown");
  console.log("   Chain ID:", addresses.chainId || "unknown");
  console.log("");

  // Check if addresses are set
  if (!addresses.mockUSDC || addresses.mockUSDC === "") {
    console.log("⚠️  MockUSDC address is empty!");
    console.log("   Run 'npm run deploy' to deploy contracts.\n");
    return;
  }

  if (!addresses.fundFactory || addresses.fundFactory === "") {
    console.log("⚠️  FundFactory address is empty!");
    console.log("   Run 'npm run deploy' to deploy contracts.\n");
    return;
  }

  // Try to connect to contracts
  try {
    console.log("🔌 Testing Connection...\n");

    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log("   Signer:", signer.address);

    // Test MockUSDC
    console.log("\n1️⃣  Testing MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = MockUSDC.attach(addresses.mockUSDC);
    
    try {
      const name = await mockUSDC.name();
      const symbol = await mockUSDC.symbol();
      const decimals = await mockUSDC.decimals();
      const balance = await mockUSDC.balanceOf(signer.address);
      
      console.log("   ✅ Connected!");
      console.log("   Name:", name);
      console.log("   Symbol:", symbol);
      console.log("   Decimals:", decimals);
      console.log("   Balance:", hre.ethers.formatUnits(balance, decimals), symbol);
    } catch (error) {
      console.log("   ❌ Connection failed:", error.message);
    }

    // Test FundFactory
    console.log("\n2️⃣  Testing FundFactory...");
    const FundFactory = await hre.ethers.getContractFactory("FundFactory");
    const fundFactory = FundFactory.attach(addresses.fundFactory);
    
    try {
      const fundCount = await fundFactory.getFundCount();
      const allFunds = await fundFactory.getAllFunds();
      
      console.log("   ✅ Connected!");
      console.log("   Fund Count:", fundCount.toString());
      console.log("   Funds:", allFunds.length > 0 ? allFunds : "None");
    } catch (error) {
      console.log("   ❌ Connection failed:", error.message);
    }

    // Test network
    console.log("\n3️⃣  Testing Network...");
    const network = await hre.ethers.provider.getNetwork();
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Expected: 1337");
    
    if (network.chainId.toString() === addresses.chainId) {
      console.log("   ✅ Network matches!");
    } else {
      console.log("   ⚠️  Network mismatch!");
    }

    console.log("\n✅ Connection Verification Complete!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Start frontend: cd frontend && npm run dev");
    console.log("   2. Connect MetaMask to Hardhat network (Chain ID: 1337)");
    console.log("   3. Import test account");
    console.log("   4. Connect wallet in frontend");
    console.log("   5. Test the application\n");

  } catch (error) {
    console.error("❌ Error verifying connection:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

