const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying Complete Demo Setup...\n");

  // Check 1: Contract addresses file exists
  const addressesPath = path.join(__dirname, "../frontend/src/utils/contractAddresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.log("❌ contractAddresses.json not found!");
    console.log("   Run 'npm run setup:demo' first.\n");
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  console.log("✅ Contract addresses file found");
  console.log("   MockUSDC:", addresses.mockUSDC || "❌ NOT SET");
  console.log("   FundFactory:", addresses.fundFactory || "❌ NOT SET");
  console.log("   Chain ID:", addresses.chainId || "unknown");
  console.log("");

  // Check 2: Contracts are deployed
  if (!addresses.mockUSDC || !addresses.fundFactory) {
    console.log("❌ Contract addresses are empty!");
    console.log("   Run 'npm run setup:demo' to deploy contracts.\n");
    return;
  }

  try {
    const [signer] = await hre.ethers.getSigners();
    console.log("✅ Connected to Hardhat network");
    console.log("   Signer:", signer.address);
    console.log("");

    // Check 3: MockUSDC contract
    console.log("1️⃣  Checking MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = MockUSDC.attach(addresses.mockUSDC);
    
    try {
      const name = await mockUSDC.name();
      const symbol = await mockUSDC.symbol();
      const decimals = await mockUSDC.decimals();
      const totalSupply = await mockUSDC.totalSupply();
      
      console.log("   ✅ MockUSDC contract found!");
      console.log("   Name:", name);
      console.log("   Symbol:", symbol);
      console.log("   Decimals:", decimals);
      console.log("   Total Supply:", hre.ethers.formatUnits(totalSupply, decimals), symbol);
    } catch (error) {
      console.log("   ❌ MockUSDC contract not found at address");
      console.log("   Error:", error.message);
      console.log("   Run 'npm run setup:demo' to deploy.\n");
      return;
    }

    // Check 4: FundFactory contract
    console.log("\n2️⃣  Checking FundFactory...");
    const FundFactory = await hre.ethers.getContractFactory("FundFactory");
    const fundFactory = FundFactory.attach(addresses.fundFactory);
    
    try {
      const fundCount = await fundFactory.getFundCount();
      const allFunds = await fundFactory.getAllFunds();
      
      console.log("   ✅ FundFactory contract found!");
      console.log("   Fund Count:", fundCount.toString());
      console.log("   Funds:", allFunds.length > 0 ? allFunds.map(f => f.slice(0, 10) + "...") : "None");
      
      if (allFunds.length > 0) {
        console.log("\n   📊 Fund Details:");
        const Fund = await hre.ethers.getContractFactory("Fund");
        for (let i = 0; i < Math.min(allFunds.length, 3); i++) {
          const fund = Fund.attach(allFunds[i]);
          const stats = await fund.getFundStats();
          const vcManager = await fund.vcManager();
          console.log(`   Fund ${i + 1}:`);
          console.log(`     Address: ${allFunds[i].slice(0, 10)}...`);
          console.log(`     VC Manager: ${vcManager.slice(0, 10)}...`);
          console.log(`     Total Deposited: ${hre.ethers.formatUnits(stats[0], 6)} mUSDC`);
          console.log(`     Total Invested: ${hre.ethers.formatUnits(stats[1], 6)} mUSDC`);
        }
      }
    } catch (error) {
      console.log("   ❌ FundFactory contract not found at address");
      console.log("   Error:", error.message);
      console.log("   Run 'npm run setup:demo' to deploy.\n");
      return;
    }

    // Check 5: Account balances
    console.log("\n3️⃣  Checking Test Account Balances...");
    const [deployer, vcManager, lp1, lp2, startup] = await hre.ethers.getSigners();
    
    const accounts = [
      { name: "Deployer (Account 0)", address: deployer.address },
      { name: "VC Manager (Account 1)", address: vcManager.address },
      { name: "LP 1 (Account 2)", address: lp1.address },
      { name: "LP 2 (Account 3)", address: lp2.address },
      { name: "Startup (Account 4)", address: startup.address },
    ];

    for (const account of accounts) {
      const ethBalance = await hre.ethers.provider.getBalance(account.address);
      const usdcBalance = await mockUSDC.balanceOf(account.address);
      
      console.log(`   ${account.name}:`);
      console.log(`     ETH: ${hre.ethers.formatEther(ethBalance)} ETH`);
      console.log(`     mUSDC: ${hre.ethers.formatUnits(usdcBalance, 6)} mUSDC`);
      
      if (parseFloat(hre.ethers.formatUnits(usdcBalance, 6)) < 1000) {
        console.log(`     ⚠️  Low mUSDC balance - may need to run setup:demo`);
      }
    }

    // Check 6: Network
    console.log("\n4️⃣  Checking Network...");
    const network = await hre.ethers.provider.getNetwork();
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Expected: 1337");
    
    if (network.chainId.toString() === addresses.chainId) {
      console.log("   ✅ Network matches!");
    } else {
      console.log("   ⚠️  Network mismatch!");
      console.log("   Make sure MetaMask is on the correct network.");
    }

    console.log("\n✅ Setup Verification Complete!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Start frontend: cd frontend && npm run dev");
    console.log("   2. Open browser to the URL shown");
    console.log("   3. Connect MetaMask to Hardhat network (Chain ID: 1337)");
    console.log("   4. Import test accounts using private keys from 'npm run node'");
    console.log("   5. Start the demo!\n");

  } catch (error) {
    console.error("❌ Error during verification:", error.message);
    console.log("\n💡 Try running 'npm run setup:demo' to fix issues.\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

