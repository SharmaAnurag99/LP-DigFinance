const hre = require("hardhat");

async function main() {
  console.log("🚀 Setting up COMPLETE testnet demo with token distribution...\n");

  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable not set!");
    console.log("\nSet it with: export PRIVATE_KEY=your_private_key_here\n");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  
  // Derive additional accounts from the deployer's private key
  // Using Hardhat's deterministic account generation
  const provider = hre.ethers.provider;
  
  // Get the standard Hardhat accounts (these are deterministic)
  // Account 0 = deployer, Account 1 = VC Manager, etc.
  const vcManager = new hre.ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    provider
  );
  const lp1 = new hre.ethers.Wallet(
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    provider
  );
  const lp2 = new hre.ethers.Wallet(
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    provider
  );
  const startup = new hre.ethers.Wallet(
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f873d9ba39eb1a0b2b6c0",
    provider
  );
  
  console.log("📋 Accounts:");
  console.log("  Deployer:", deployer.address);
  console.log("  VC Manager:", vcManager.address);
  console.log("  LP 1:", lp1.address);
  console.log("  LP 2:", lp2.address);
  console.log("  Startup:", startup.address);
  console.log("");

  // Check balances
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer ETH balance:", hre.ethers.formatEther(deployerBalance), "ETH");
  
  if (deployerBalance < hre.ethers.parseEther("0.01")) {
    console.error("❌ Insufficient ETH! Need at least 0.01 ETH for deployment.");
    console.log("   Get testnet ETH from: https://sepoliafaucet.com/\n");
    process.exit(1);
  }

  // Step 1: Deploy MockUSDC
  console.log("1️⃣  Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("   ✅ MockUSDC deployed:", mockUSDCAddress);

  // Step 2: Mint tokens to deployer (they get 1M from constructor)
  console.log("\n2️⃣  Checking initial token supply...");
  const totalSupply = await mockUSDC.totalSupply();
  console.log("   ✅ Total supply:", hre.ethers.formatUnits(totalSupply, 6), "mUSDC");

  // Step 3: Distribute tokens to test accounts
  console.log("\n3️⃣  Distributing MockUSDC to test accounts...");
  const transferAmount = hre.ethers.parseUnits("100000", 6); // 100,000 mUSDC per account
  
  // Transfer to VC Manager
  console.log("   Transferring to VC Manager...");
  const tx1 = await mockUSDC.transfer(vcManager.address, transferAmount);
  await tx1.wait();
  const vcBalance = await mockUSDC.balanceOf(vcManager.address);
  console.log("   ✅ VC Manager:", hre.ethers.formatUnits(vcBalance, 6), "mUSDC");

  // Transfer to LP 1
  console.log("   Transferring to LP 1...");
  const tx2 = await mockUSDC.transfer(lp1.address, transferAmount);
  await tx2.wait();
  const lp1Balance = await mockUSDC.balanceOf(lp1.address);
  console.log("   ✅ LP 1:", hre.ethers.formatUnits(lp1Balance, 6), "mUSDC");

  // Transfer to LP 2
  console.log("   Transferring to LP 2...");
  const tx3 = await mockUSDC.transfer(lp2.address, transferAmount);
  await tx3.wait();
  const lp2Balance = await mockUSDC.balanceOf(lp2.address);
  console.log("   ✅ LP 2:", hre.ethers.formatUnits(lp2Balance, 6), "mUSDC");

  // Transfer to Startup
  console.log("   Transferring to Startup...");
  const startupAmount = hre.ethers.parseUnits("10000", 6);
  const tx4 = await mockUSDC.transfer(startup.address, startupAmount);
  await tx4.wait();
  const startupBalance = await mockUSDC.balanceOf(startup.address);
  console.log("   ✅ Startup:", hre.ethers.formatUnits(startupBalance, 6), "mUSDC");

  // Step 4: Send ETH to test accounts for gas
  console.log("\n4️⃣  Sending ETH to test accounts for gas...");
  const ethAmount = hre.ethers.parseEther("0.01");
  
  console.log("   Sending to VC Manager...");
  const txVC = await deployer.sendTransaction({ to: vcManager.address, value: ethAmount });
  await txVC.wait();
  const vcEthBalance = await hre.ethers.provider.getBalance(vcManager.address);
  console.log("   ✅ VC Manager ETH:", hre.ethers.formatEther(vcEthBalance));
  
  console.log("   Sending to LP 1...");
  const txLP1 = await deployer.sendTransaction({ to: lp1.address, value: ethAmount });
  await txLP1.wait();
  
  console.log("   Sending to LP 2...");
  const txLP2 = await deployer.sendTransaction({ to: lp2.address, value: ethAmount });
  await txLP2.wait();
  
  console.log("   Sending to Startup...");
  const txStartup = await deployer.sendTransaction({ to: startup.address, value: ethAmount });
  await txStartup.wait();
  
  // Verify balances
  const vcFinalBalance = await hre.ethers.provider.getBalance(vcManager.address);
  console.log("   ✅ All accounts funded. VC Manager balance:", hre.ethers.formatEther(vcFinalBalance), "ETH");

  // Step 5: Deploy FundFactory
  console.log("\n5️⃣  Deploying FundFactory...");
  const FundFactory = await hre.ethers.getContractFactory("FundFactory");
  const fundFactory = await FundFactory.deploy();
  await fundFactory.waitForDeployment();
  const fundFactoryAddress = await fundFactory.getAddress();
  console.log("   ✅ FundFactory deployed:", fundFactoryAddress);

  // Step 6: Create demo fund (using deployer, but we'll note VC Manager address)
  console.log("\n6️⃣  Creating demo fund...");
  console.log("   Note: Creating as deployer, but VC Manager address is:", vcManager.address);
  const fundTx = await fundFactory.createFund(mockUSDCAddress, 20);
  const fundReceipt = await fundTx.wait();

  // Get fund address from event
  let fundCreatedEvent = null;
  for (const log of fundReceipt.logs) {
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
  const fs = require("fs");
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

  console.log("\n=== 🎉 COMPLETE SETUP FINISHED ===");
  console.log("\n📊 Contract Addresses:");
  console.log("   MockUSDC:", mockUSDCAddress);
  console.log("   FundFactory:", fundFactoryAddress);
  console.log("   Demo Fund:", fundAddress);
  console.log("   LP Token:", lpTokenAddress);
  console.log("   Network:", networkName);
  console.log("   Chain ID:", network.chainId.toString());

  console.log("\n💰 Final Account Balances:");
  console.log("   VC Manager:", hre.ethers.formatUnits(vcBalance, 6), "mUSDC");
  console.log("   LP 1:", hre.ethers.formatUnits(lp1Balance, 6), "mUSDC");
  console.log("   LP 2:", hre.ethers.formatUnits(lp2Balance, 6), "mUSDC");
  console.log("   Startup:", hre.ethers.formatUnits(startupBalance, 6), "mUSDC");

  console.log("\n📝 Account Addresses for MetaMask:");
  console.log("   VC Manager:", vcManager.address);
  console.log("   LP 1:", lp1.address);
  console.log("   LP 2:", lp2.address);
  console.log("   Startup:", startup.address);
  console.log("\n💡 Import these accounts into MetaMask using their private keys");
  console.log("   (You'll need to export them from Hardhat or use the deployer's private key)");

  console.log("\n✅ Addresses saved to frontend/src/utils/contractAddresses.json");
  console.log("\n🎯 Next Steps:");
  console.log("   1. Make sure MetaMask is on", networkName, "network");
  console.log("   2. Import test accounts into MetaMask");
  console.log("   3. Start frontend: cd frontend && npm run dev");
  console.log("   4. Connect MetaMask and start your demo!");
  console.log("\n🚀 Everything is ready for your class simulation!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

