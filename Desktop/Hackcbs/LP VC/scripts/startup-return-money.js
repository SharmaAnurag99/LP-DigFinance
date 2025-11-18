const hre = require("hardhat");
const fs = require("fs");

/**
 * Helper script to simulate startup returning money to VC
 * This makes demo easier - startup sends USDC to VC wallet
 * Then VC can deposit returns via frontend
 */
async function main() {
  console.log("💰 Startup Return Money - Helper Script\n");
  console.log("=".repeat(60));

  // Load addresses
  const addresses = JSON.parse(
    fs.readFileSync("./frontend/src/utils/contractAddresses.json", "utf8")
  );

  const mockUSDCAddress = addresses.mockUSDC;
  if (!mockUSDCAddress) {
    console.error("❌ Error: MockUSDC address not found!");
    process.exit(1);
  }

  // Get wallets
  const startupKey = process.env.STARTUP_PRIVATE_KEY;
  const vcKey = process.env.VC_PRIVATE_KEY;

  if (!startupKey || !vcKey) {
    console.error("❌ Error: Private keys not set in .env!");
    process.exit(1);
  }

  const startupWallet = new hre.ethers.Wallet(startupKey, hre.ethers.provider);
  const vcWallet = new hre.ethers.Wallet(vcKey, hre.ethers.provider);

  console.log("\n👥 Wallets:");
  console.log("   Startup:", startupWallet.address);
  console.log("   VC Manager:", vcWallet.address);

  // Get contract
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(mockUSDCAddress);

  // Check balances before
  const startupBalanceBefore = await mockUSDC.balanceOf(startupWallet.address);
  const vcBalanceBefore = await mockUSDC.balanceOf(vcWallet.address);

  console.log("\n💰 Balances Before:");
  console.log("   Startup:", hre.ethers.formatUnits(startupBalanceBefore, 6), "mUSDC");
  console.log("   VC:", hre.ethers.formatUnits(vcBalanceBefore, 6), "mUSDC");

  // Ask for amount (or use default)
  const returnAmount = process.env.RETURN_AMOUNT 
    ? hre.ethers.parseUnits(process.env.RETURN_AMOUNT, 6)
    : hre.ethers.parseUnits("80000", 6); // Default 80k

  console.log("\n📤 Transferring:", hre.ethers.formatUnits(returnAmount, 6), "mUSDC");
  console.log("   From: Startup → To: VC");

  // Check if startup has enough
  if (startupBalanceBefore < returnAmount) {
    console.error("\n❌ Error: Startup doesn't have enough USDC!");
    console.log("   Required:", hre.ethers.formatUnits(returnAmount, 6), "mUSDC");
    console.log("   Available:", hre.ethers.formatUnits(startupBalanceBefore, 6), "mUSDC");
    process.exit(1);
  }

  // Transfer
  try {
    const tx = await mockUSDC.connect(startupWallet).transfer(vcWallet.address, returnAmount);
    console.log("\n⏳ Transaction sent:", tx.hash);
    await tx.wait();
    console.log("   ✅ Transfer confirmed!");

    // Check balances after
    const startupBalanceAfter = await mockUSDC.balanceOf(startupWallet.address);
    const vcBalanceAfter = await mockUSDC.balanceOf(vcWallet.address);

    console.log("\n💰 Balances After:");
    console.log("   Startup:", hre.ethers.formatUnits(startupBalanceAfter, 6), "mUSDC");
    console.log("   VC:", hre.ethers.formatUnits(vcBalanceAfter, 6), "mUSDC");

    console.log("\n✅ Success! Startup returned money to VC.");
    console.log("\n🎯 Next Steps:");
    console.log("   1. Go to frontend (VC Dashboard)");
    console.log("   2. Navigate to Fund Details");
    console.log("   3. Enter amount:", hre.ethers.formatUnits(returnAmount, 6), "mUSDC");
    console.log("   4. Click 'Deposit Returns'");
    console.log("   5. Then click 'Distribute Returns' to trigger carry calculation");
    console.log("\n✨ Ready for distribution demo!\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Tip: Startup wallet needs Sepolia ETH for gas!");
      console.log("   Get from: https://sepoliafaucet.com/");
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

