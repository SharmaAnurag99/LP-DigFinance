const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🎬 Full Platform Demo - Complete Flow Simulation\n");
  console.log("=" .repeat(60));

  // Load addresses from deployment
  const addresses = JSON.parse(
    fs.readFileSync("./frontend/src/utils/contractAddresses.json", "utf8")
  );

  const mockUSDCAddress = addresses.mockUSDC;
  const fundFactoryAddress = addresses.fundFactory;

  if (!mockUSDCAddress || !fundFactoryAddress) {
    console.error("❌ Error: Contract addresses not found!");
    console.log("Please run deploy-testnet.js first.\n");
    process.exit(1);
  }

  // Get signers from env
  const vcKey = process.env.VC_PRIVATE_KEY;
  const lp1Key = process.env.LP1_PRIVATE_KEY;
  const lp2Key = process.env.LP2_PRIVATE_KEY;
  const startupKey = process.env.STARTUP_PRIVATE_KEY;

  if (!vcKey || !lp1Key || !lp2Key || !startupKey) {
    console.error("❌ Error: Private keys not set in .env!");
    process.exit(1);
  }

  const vcWallet = new hre.ethers.Wallet(vcKey, hre.ethers.provider);
  const lp1Wallet = new hre.ethers.Wallet(lp1Key, hre.ethers.provider);
  const lp2Wallet = new hre.ethers.Wallet(lp2Key, hre.ethers.provider);
  const startupWallet = new hre.ethers.Wallet(startupKey, hre.ethers.provider);

  console.log("\n👥 Actors:");
  console.log("   VC Manager:", vcWallet.address);
  console.log("   LP #1:", lp1Wallet.address);
  console.log("   LP #2:", lp2Wallet.address);
  console.log("   Startup:", startupWallet.address);

  // Get contract instances
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(mockUSDCAddress);

  const FundFactory = await hre.ethers.getContractFactory("FundFactory");
  const fundFactory = FundFactory.attach(fundFactoryAddress);

  console.log("\n📋 Contracts:");
  console.log("   MockUSDC:", mockUSDCAddress);
  console.log("   FundFactory:", fundFactoryAddress);

  // Check balances
  console.log("\n💰 Initial Balances:");
  const vcEth = await hre.ethers.provider.getBalance(vcWallet.address);
  const lp1Eth = await hre.ethers.provider.getBalance(lp1Wallet.address);
  const lp2Eth = await hre.ethers.provider.getBalance(lp2Wallet.address);
  const startupEth = await hre.ethers.provider.getBalance(startupWallet.address);

  console.log("   VC ETH:", hre.ethers.formatEther(vcEth), "ETH");
  console.log("   LP1 ETH:", hre.ethers.formatEther(lp1Eth), "ETH");
  console.log("   LP2 ETH:", hre.ethers.formatEther(lp2Eth), "ETH");
  console.log("   Startup ETH:", hre.ethers.formatEther(startupEth), "ETH");

  // Check if wallets have enough ETH for gas
  const minEth = hre.ethers.parseEther("0.01");
  if (lp1Eth < minEth || lp2Eth < minEth || startupEth < minEth) {
    console.log("\n⚠️  WARNING: Some wallets need Sepolia ETH for gas!");
    if (lp1Eth < minEth) console.log("   ❌ LP1 needs ETH:", lp1Wallet.address);
    if (lp2Eth < minEth) console.log("   ❌ LP2 needs ETH:", lp2Wallet.address);
    if (startupEth < minEth) console.log("   ❌ Startup needs ETH:", startupWallet.address);
    console.log("\n💡 Get Sepolia ETH from faucet:");
    console.log("   https://sepoliafaucet.com/");
    console.log("   https://www.alchemy.com/faucets/ethereum-sepolia");
    console.log("\n⏸️  Demo paused. Fund wallets and run again.\n");
    process.exit(1);
  }

  const vcUSDC = await mockUSDC.balanceOf(vcWallet.address);
  const lp1USDC = await mockUSDC.balanceOf(lp1Wallet.address);
  const lp2USDC = await mockUSDC.balanceOf(lp2Wallet.address);
  const startupUSDC = await mockUSDC.balanceOf(startupWallet.address);

  console.log("   VC mUSDC:", hre.ethers.formatUnits(vcUSDC, 6), "mUSDC");
  console.log("   LP1 mUSDC:", hre.ethers.formatUnits(lp1USDC, 6), "mUSDC");
  console.log("   LP2 mUSDC:", hre.ethers.formatUnits(lp2USDC, 6), "mUSDC");
  console.log("   Startup mUSDC:", hre.ethers.formatUnits(startupUSDC, 6), "mUSDC");

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 1: VC Creates Fund (20% carry)");
  console.log("=".repeat(60));

  const createTx = await fundFactory.connect(vcWallet).createFund(mockUSDCAddress, 20);
  const createReceipt = await createTx.wait();

  let fundAddress, lpTokenAddress;
  for (const log of createReceipt.logs) {
    try {
      const parsed = fundFactory.interface.parseLog(log);
      if (parsed && parsed.name === "FundCreated") {
        fundAddress = parsed.args.fundAddress;
        lpTokenAddress = parsed.args.lpTokenAddress;
        break;
      }
    } catch (e) {}
  }

  if (!fundAddress) {
    const allFunds = await fundFactory.getAllFunds();
    fundAddress = allFunds[allFunds.length - 1];
    const Fund = await hre.ethers.getContractFactory("Fund");
    const tempFund = Fund.attach(fundAddress);
    lpTokenAddress = await tempFund.lpToken();
  }

  console.log("   ✅ Fund Created:", fundAddress);
  console.log("   ✅ LP Token:", lpTokenAddress);

  const Fund = await hre.ethers.getContractFactory("Fund");
  const fund = Fund.attach(fundAddress);
  const FundToken = await hre.ethers.getContractFactory("FundToken");
  const lpToken = FundToken.attach(lpTokenAddress);

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 2: LP #1 Deposits 50,000 mUSDC");
  console.log("=".repeat(60));

  const deposit1Amount = hre.ethers.parseUnits("50000", 6);
  await mockUSDC.connect(lp1Wallet).approve(fundAddress, deposit1Amount);
  const deposit1Tx = await fund.connect(lp1Wallet).deposit(deposit1Amount);
  await deposit1Tx.wait();
  const lp1Balance = await lpToken.balanceOf(lp1Wallet.address);
  console.log("   ✅ LP1 deposited 50,000 mUSDC");
  console.log("   ✅ LP1 received", hre.ethers.formatUnits(lp1Balance, 6), "LP tokens");

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 3: LP #2 Deposits 30,000 mUSDC");
  console.log("=".repeat(60));

  const deposit2Amount = hre.ethers.parseUnits("30000", 6);
  await mockUSDC.connect(lp2Wallet).approve(fundAddress, deposit2Amount);
  const deposit2Tx = await fund.connect(lp2Wallet).deposit(deposit2Amount);
  await deposit2Tx.wait();
  const lp2Balance = await lpToken.balanceOf(lp2Wallet.address);
  console.log("   ✅ LP2 deposited 30,000 mUSDC");
  console.log("   ✅ LP2 received", hre.ethers.formatUnits(lp2Balance, 6), "LP tokens");

  const stats1 = await fund.getFundStats();
  console.log("\n   📊 Fund Stats After Deposits:");
  console.log("      Total Deposited:", hre.ethers.formatUnits(stats1[0], 6), "mUSDC");
  console.log("      Contract Balance:", hre.ethers.formatUnits(stats1[3], 6), "mUSDC");
  console.log("      LP Token Supply:", hre.ethers.formatUnits(stats1[4], 6));

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 4: VC Invests 60,000 mUSDC in Startup");
  console.log("=".repeat(60));

  const investAmount = hre.ethers.parseUnits("60000", 6);
  const investTx = await fund.connect(vcWallet).invest(
    startupWallet.address,
    investAmount,
    "Series A - Seed Funding Round"
  );
  await investTx.wait();
  console.log("   ✅ VC invested 60,000 mUSDC in startup");
  console.log("   ✅ Startup received funds");

  const startupBalance = await mockUSDC.balanceOf(startupWallet.address);
  console.log("   📊 Startup balance:", hre.ethers.formatUnits(startupBalance, 6), "mUSDC");

  const stats2 = await fund.getFundStats();
  console.log("\n   📊 Fund Stats After Investment:");
  console.log("      Total Invested:", hre.ethers.formatUnits(stats2[1], 6), "mUSDC");
  console.log("      Contract Balance:", hre.ethers.formatUnits(stats2[3], 6), "mUSDC");

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 5: VC Deposits Returns (80,000 mUSDC)");
  console.log("=".repeat(60));

  // VC needs to have USDC to deposit returns (simulate startup paying back)
  // In real scenario, startup would transfer back, but for demo VC transfers
  const returnsAmount = hre.ethers.parseUnits("80000", 6);
  await mockUSDC.connect(vcWallet).approve(fundAddress, returnsAmount);
  const returnsTx = await fund.connect(vcWallet).depositReturns(returnsAmount);
  await returnsTx.wait();
  console.log("   ✅ VC deposited 80,000 mUSDC as returns");

  const stats3 = await fund.getFundStats();
  console.log("\n   📊 Fund Stats After Returns:");
  console.log("      Total Returns:", hre.ethers.formatUnits(stats3[2], 6), "mUSDC");
  console.log("      Contract Balance:", hre.ethers.formatUnits(stats3[3], 6), "mUSDC");

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 6: VC Distributes Returns (20% carry on profits)");
  console.log("=".repeat(60));

  const distributeTx = await fund.connect(vcWallet).distributeReturns();
  await distributeTx.wait();
  console.log("   ✅ Returns distributed");
  console.log("   💰 VC received carry (20% of profits)");
  console.log("   💰 LPs can now withdraw their share + returns");

  const stats4 = await fund.getFundStats();
  console.log("\n   📊 Fund Stats After Distribution:");
  console.log("      Total Returns:", hre.ethers.formatUnits(stats4[2], 6), "mUSDC (reset)");
  console.log("      Contract Balance:", hre.ethers.formatUnits(stats4[3], 6), "mUSDC");

  const vcBalanceAfter = await mockUSDC.balanceOf(vcWallet.address);
  console.log("   📊 VC balance after carry:", hre.ethers.formatUnits(vcBalanceAfter, 6), "mUSDC");

  console.log("\n" + "=".repeat(60));
  console.log("🎯 STEP 7: LP #1 Withdraws 50% of LP Tokens");
  console.log("=".repeat(60));

  const lp1TokenBalance = await lpToken.balanceOf(lp1Wallet.address);
  const withdrawAmount = lp1TokenBalance / 2n;
  const withdrawTx = await fund.connect(lp1Wallet).lpWithdraw(withdrawAmount);
  await withdrawTx.wait();
  console.log("   ✅ LP1 withdrew", hre.ethers.formatUnits(withdrawAmount, 6), "LP tokens");
  
  const lp1USDCAfter = await mockUSDC.balanceOf(lp1Wallet.address);
  const lp1TokensAfter = await lpToken.balanceOf(lp1Wallet.address);
  console.log("   📊 LP1 mUSDC balance:", hre.ethers.formatUnits(lp1USDCAfter, 6), "mUSDC");
  console.log("   📊 LP1 LP tokens remaining:", hre.ethers.formatUnits(lp1TokensAfter, 6));

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEMO COMPLETE!");
  console.log("=".repeat(60));

  console.log("\n📊 Final Summary:");
  const finalStats = await fund.getFundStats();
  console.log("   Fund Address:", fundAddress);
  console.log("   Total Deposited:", hre.ethers.formatUnits(finalStats[0], 6), "mUSDC");
  console.log("   Total Invested:", hre.ethers.formatUnits(finalStats[1], 6), "mUSDC");
  console.log("   Contract Balance:", hre.ethers.formatUnits(finalStats[3], 6), "mUSDC");
  console.log("   LP Token Supply:", hre.ethers.formatUnits(finalStats[4], 6));

  console.log("\n🎯 For Frontend Demo:");
  console.log("   1. Start frontend: cd frontend && npm run dev");
  console.log("   2. Connect MetaMask with these wallets:");
  console.log("      - VC:", vcWallet.address);
  console.log("      - LP1:", lp1Wallet.address);
  console.log("      - LP2:", lp2Wallet.address);
  console.log("      - Startup:", startupWallet.address);
  console.log("   3. Network: Sepolia (Chain ID: 11155111)");
  console.log("   4. Fund Address:", fundAddress);
  console.log("\n✨ Ready for class demo!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

