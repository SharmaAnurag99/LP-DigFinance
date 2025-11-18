const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MockUSDC
  console.log("\n1. Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", mockUSDCAddress);

  // Deploy FundFactory
  console.log("\n2. Deploying FundFactory...");
  const FundFactory = await hre.ethers.getContractFactory("FundFactory");
  const fundFactory = await FundFactory.deploy();
  await fundFactory.waitForDeployment();
  const fundFactoryAddress = await fundFactory.getAddress();
  console.log("FundFactory deployed to:", fundFactoryAddress);

  // Get test accounts (Account 0 is deployer, already has 1M mUSDC from mint)
  const signers = await hre.ethers.getSigners();
  
  console.log("\n3. Distributing MockUSDC to test accounts...");
  const transferAmount = hre.ethers.parseUnits("100000", 6); // 100,000 USDC per account
  
  // Transfer to Account 1-4 (Account 0 is deployer, already has 1M mUSDC)
  for (let i = 1; i <= 4; i++) {
    await mockUSDC.transfer(signers[i].address, transferAmount);
    console.log(`   ✅ Transferred 100,000 mUSDC to Account ${i}: ${signers[i].address}`);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("MockUSDC Address:", mockUSDCAddress);
  console.log("FundFactory Address:", fundFactoryAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("\n📋 Test Accounts with Funds:");
  // Show Account 0 (Deployer - has 1M from mint)
  const deployerBalance = await mockUSDC.balanceOf(deployer.address);
  console.log(`   Account 0 (Deployer): ${deployer.address} - ${hre.ethers.formatUnits(deployerBalance, 6)} mUSDC`);
  
  // Show Account 1-4 (received 100K each)
  for (let i = 1; i <= 4; i++) {
    const balance = await mockUSDC.balanceOf(signers[i].address);
    console.log(`   Account ${i}: ${signers[i].address} - ${hre.ethers.formatUnits(balance, 6)} mUSDC`);
  }
  
  console.log("\n💡 Use Account 0 as VC Manager (has 1M mUSDC)");
  console.log("💡 Use Account 1-4 as LPs/Startups (each has 100K mUSDC)");
  console.log("\nTo create a fund, call fundFactory.createFund() with:");
  console.log("  - stablecoinAddress:", mockUSDCAddress);
  console.log("  - carriedInterestPercent: (e.g., 20 for 20%)");

  // Save addresses to a file for frontend
  const fs = require("fs");
  const addresses = {
    mockUSDC: mockUSDCAddress,
    fundFactory: fundFactoryAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
  };
  
  fs.writeFileSync(
    "./frontend/src/utils/contractAddresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✅ Contract addresses saved to frontend/src/utils/contractAddresses.json");
  console.log("\n🎉 Setup Complete! All test accounts have funds ready for testing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

