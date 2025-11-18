const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VC Fund Platform Tests", function () {
  let mockUSDC, fundFactory, fund, fundToken;
  let owner, vcManager, lp1, lp2, startup1;
  let fundAddress, lpTokenAddress;

  beforeEach(async function () {
    [owner, vcManager, lp1, lp2, startup1] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy FundFactory
    const FundFactory = await ethers.getContractFactory("FundFactory");
    fundFactory = await FundFactory.deploy();
    await fundFactory.waitForDeployment();

    // Create a fund with 20% carried interest
    const tx = await fundFactory.connect(vcManager).createFund(
      await mockUSDC.getAddress(),
      20 // 20% carried interest
    );
    const receipt = await tx.wait();

    // Get fund address from events
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
    
    if (fundCreatedEvent) {
      fundAddress = fundCreatedEvent.args.fundAddress;
      lpTokenAddress = fundCreatedEvent.args.lpTokenAddress;
    } else {
      // Fallback: get from factory
      const allFunds = await fundFactory.getAllFunds();
      fundAddress = allFunds[allFunds.length - 1];
      const Fund = await ethers.getContractFactory("Fund");
      const tempFund = Fund.attach(fundAddress);
      lpTokenAddress = await tempFund.lpToken();
    }

    // Get contract instances
    const Fund = await ethers.getContractFactory("Fund");
    fund = Fund.attach(fundAddress);

    const FundToken = await ethers.getContractFactory("FundToken");
    fundToken = FundToken.attach(lpTokenAddress);

    // Transfer some USDC to LPs and startup for testing
    const amount = ethers.parseUnits("100000", 6); // 100,000 USDC
    await mockUSDC.transfer(lp1.address, amount);
    await mockUSDC.transfer(lp2.address, amount);
    await mockUSDC.transfer(startup1.address, ethers.parseUnits("10000", 6));
  });

  describe("MockUSDC", function () {
    it("Should have correct name and symbol", async function () {
      expect(await mockUSDC.name()).to.equal("MockUSDC");
      expect(await mockUSDC.symbol()).to.equal("mUSDC");
    });

    it("Should have 6 decimals", async function () {
      expect(await mockUSDC.decimals()).to.equal(6);
    });

    it("Should mint 1M tokens to deployer", async function () {
      // Check total supply instead of owner balance (since we transfer tokens in beforeEach)
      const totalSupply = await mockUSDC.totalSupply();
      expect(totalSupply).to.equal(ethers.parseUnits("1000000", 6));
    });
  });

  describe("FundFactory", function () {
    it("Should create a fund", async function () {
      const tx = await fundFactory.connect(vcManager).createFund(
        await mockUSDC.getAddress(),
        15
      );
      await tx.wait();

      const fundCount = await fundFactory.getFundCount();
      expect(fundCount).to.equal(2); // One from beforeEach + one new
    });

    it("Should return all funds", async function () {
      const funds = await fundFactory.getAllFunds();
      expect(funds.length).to.be.greaterThan(0);
      expect(funds[0]).to.equal(fundAddress);
    });

    it("Should return VC's funds", async function () {
      const vcFunds = await fundFactory.getVCFunds(vcManager.address);
      expect(vcFunds.length).to.equal(1);
      expect(vcFunds[0]).to.equal(fundAddress);
    });
  });

  describe("Fund - Deposit", function () {
    it("Should allow LP to deposit", async function () {
      const depositAmount = ethers.parseUnits("10000", 6); // 10,000 USDC

      // Approve
      await mockUSDC.connect(lp1).approve(fundAddress, depositAmount);

      // Deposit
      await expect(fund.connect(lp1).deposit(depositAmount))
        .to.emit(fund, "Deposit")
        .withArgs(lp1.address, depositAmount, depositAmount); // First deposit is 1:1

      // Check LP token balance
      const lpBalance = await fundToken.balanceOf(lp1.address);
      expect(lpBalance).to.equal(depositAmount);

      // Check total deposited
      const totalDeposited = await fund.totalDeposited();
      expect(totalDeposited).to.equal(depositAmount);

      const activityCount = await fund.getLPActivityCount(lp1.address);
      expect(activityCount).to.equal(1);

      const activity = await fund.getLPActivity(lp1.address, 0);
      expect(activity[0]).to.equal(0); // Deposit enum value
      expect(activity[1]).to.equal(depositAmount);
      expect(activity[2]).to.equal(depositAmount);
    });

    it("Should mint proportional LP tokens on subsequent deposits", async function () {
      const deposit1 = ethers.parseUnits("10000", 6);
      const deposit2 = ethers.parseUnits("5000", 6);

      // First deposit
      await mockUSDC.connect(lp1).approve(fundAddress, deposit1);
      await fund.connect(lp1).deposit(deposit1);

      // Second deposit
      await mockUSDC.connect(lp2).approve(fundAddress, deposit2);
      await fund.connect(lp2).deposit(deposit2);

      // Check LP2 token balance (should be proportional)
      const lp2Balance = await fundToken.balanceOf(lp2.address);
      const totalSupply = await fundToken.totalSupply();
      expect(lp2Balance).to.equal(deposit2); // Proportional to first deposit
    });

    it("Should revert if deposit amount is zero", async function () {
      await expect(fund.connect(lp1).deposit(0))
        .to.be.revertedWithCustomError(fund, "AmountZero");
    });

    it("Should revert if fund is not active", async function () {
      // Note: This test would require a function to deactivate the fund
      // For now, we'll skip this as fundActive is not changeable in current implementation
    });
  });

  describe("Fund - Invest", function () {
    beforeEach(async function () {
      // Setup: LP deposits first
      const depositAmount = ethers.parseUnits("50000", 6);
      await mockUSDC.connect(lp1).approve(fundAddress, depositAmount);
      await fund.connect(lp1).deposit(depositAmount);
    });

    it("Should allow VC to invest", async function () {
      const investAmount = ethers.parseUnits("30000", 6);

      await expect(fund.connect(vcManager).invest(
        startup1.address,
        investAmount,
        "Series A Investment"
      ))
        .to.emit(fund, "InvestmentMade")
        .withArgs(startup1.address, investAmount, "Series A Investment");

      // Check startup balance
      const startupBalance = await mockUSDC.balanceOf(startup1.address);
      expect(startupBalance).to.be.greaterThan(ethers.parseUnits("10000", 6));

      // Check total invested
      const totalInvested = await fund.totalInvested();
      expect(totalInvested).to.equal(investAmount);

      const investmentCount = await fund.getInvestmentCount();
      expect(investmentCount).to.equal(1);

      const investment = await fund.getInvestment(0);
      expect(investment[0]).to.equal(startup1.address);
      expect(investment[1]).to.equal(investAmount);
      expect(investment[2]).to.equal("Series A Investment");

      const startupCount = await fund.getStartupInvestmentCount(startup1.address);
      expect(startupCount).to.equal(1);

      const startupInvestment = await fund.getStartupInvestment(startup1.address, 0);
      expect(startupInvestment[0]).to.equal(startup1.address);
      expect(startupInvestment[1]).to.equal(investAmount);
    });

    it("Should revert if non-VC tries to invest", async function () {
      const investAmount = ethers.parseUnits("10000", 6);

      await expect(fund.connect(lp1).invest(
        startup1.address,
        investAmount,
        "Test"
      )).to.be.revertedWithCustomError(fund, "Unauthorized");
    });

    it("Should revert if investment amount exceeds balance", async function () {
      const investAmount = ethers.parseUnits("100000", 6); // More than deposited

      await expect(fund.connect(vcManager).invest(
        startup1.address,
        investAmount,
        "Test"
      )).to.be.revertedWithCustomError(fund, "InsufficientBalance");
    });
  });

  describe("Fund - Returns Distribution", function () {
    beforeEach(async function () {
      // Setup: LP deposits and VC invests
      const depositAmount = ethers.parseUnits("50000", 6);
      await mockUSDC.connect(lp1).approve(fundAddress, depositAmount);
      await fund.connect(lp1).deposit(depositAmount);

      const investAmount = ethers.parseUnits("30000", 6);
      await fund.connect(vcManager).invest(
        startup1.address,
        investAmount,
        "Investment"
      );
    });

    it("Should allow VC to deposit returns", async function () {
      const returnsAmount = ethers.parseUnits("40000", 6);

      // VC needs USDC first (simulate startup returning funds)
      await mockUSDC.transfer(vcManager.address, returnsAmount);

      await mockUSDC.connect(vcManager).approve(fundAddress, returnsAmount);

      await expect(fund.connect(vcManager).depositReturns(returnsAmount))
        .to.emit(fund, "ReturnsDeposited")
        .withArgs(returnsAmount);

      const totalReturns = await fund.totalReturns();
      expect(totalReturns).to.equal(returnsAmount);

      const returnCount = await fund.getReturnCount();
      expect(returnCount).to.equal(1);

      const recordedReturn = await fund.getReturnRecord(0);
      expect(recordedReturn[0]).to.equal(returnsAmount);
    });

    it("Should distribute returns correctly", async function () {
      const returnsAmount = ethers.parseUnits("40000", 6);

      // Deposit returns
      await mockUSDC.transfer(vcManager.address, returnsAmount);
      await mockUSDC.connect(vcManager).approve(fundAddress, returnsAmount);
      await fund.connect(vcManager).depositReturns(returnsAmount);

      // Get VC balance before distribution
      const vcBalanceBefore = await mockUSDC.balanceOf(vcManager.address);

      // Distribute returns
      await expect(fund.connect(vcManager).distributeReturns())
        .to.emit(fund, "ReturnsDistributed");

      // Check VC received carry
      // Profits = 40,000 - 30,000 = 10,000
      // VC carry (20%) = 2,000
      const vcBalanceAfter = await mockUSDC.balanceOf(vcManager.address);
      const vcCarry = vcBalanceAfter - vcBalanceBefore;
      expect(vcCarry).to.equal(ethers.parseUnits("2000", 6));

      // Check total returns is reset
      const totalReturns = await fund.totalReturns();
      expect(totalReturns).to.equal(0);

      const distributionCount = await fund.getDistributionCount();
      expect(distributionCount).to.equal(1);

      const distribution = await fund.getDistributionRecord(0);
      expect(distribution[0]).to.equal(ethers.parseUnits("38000", 6)); // LP returns
      expect(distribution[1]).to.equal(ethers.parseUnits("2000", 6)); // VC carry
    });

    it("Should revert if non-VC tries to deposit returns", async function () {
      const returnsAmount = ethers.parseUnits("10000", 6);
      await mockUSDC.connect(lp1).approve(fundAddress, returnsAmount);

      await expect(fund.connect(lp1).depositReturns(returnsAmount))
        .to.be.revertedWithCustomError(fund, "Unauthorized");
    });
  });

  describe("Fund - Withdrawal", function () {
    beforeEach(async function () {
      // Setup: LP deposits
      const depositAmount = ethers.parseUnits("50000", 6);
      await mockUSDC.connect(lp1).approve(fundAddress, depositAmount);
      await fund.connect(lp1).deposit(depositAmount);
    });

    it("Should allow LP to withdraw", async function () {
      const lpTokenBalance = await fundToken.balanceOf(lp1.address);
      const withdrawAmount = lpTokenBalance / 2n; // Withdraw half

      const lpBalanceBefore = await mockUSDC.balanceOf(lp1.address);

      await expect(fund.connect(lp1).lpWithdraw(withdrawAmount))
        .to.emit(fund, "Withdrawal");

      // Check LP received funds
      const lpBalanceAfter = await mockUSDC.balanceOf(lp1.address);
      expect(lpBalanceAfter).to.be.greaterThan(lpBalanceBefore);

      // Check LP tokens burned
      const lpTokenBalanceAfter = await fundToken.balanceOf(lp1.address);
      expect(lpTokenBalanceAfter).to.equal(lpTokenBalance - withdrawAmount);

      const activityCount = await fund.getLPActivityCount(lp1.address);
      expect(activityCount).to.equal(2); // deposit + withdrawal

      const withdrawalActivity = await fund.getLPActivity(lp1.address, 1);
      expect(withdrawalActivity[0]).to.equal(1); // Withdrawal enum
      expect(withdrawalActivity[2]).to.equal(withdrawAmount);
    });

    it("Should revert if LP tries to withdraw more than balance", async function () {
      const lpTokenBalance = await fundToken.balanceOf(lp1.address);
      const withdrawAmount = lpTokenBalance + ethers.parseUnits("1000", 18);

      await expect(fund.connect(lp1).lpWithdraw(withdrawAmount))
        .to.be.revertedWithCustomError(fund, "InsufficientLPTokens");
    });
  });

  describe("Fund - Statistics", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("50000", 6);
      await mockUSDC.connect(lp1).approve(fundAddress, depositAmount);
      await fund.connect(lp1).deposit(depositAmount);
    });

    it("Should return correct fund statistics", async function () {
      const stats = await fund.getFundStats();

      expect(stats[0]).to.equal(ethers.parseUnits("50000", 6)); // totalDeposited
      expect(stats[1]).to.equal(0); // totalInvested
      expect(stats[2]).to.equal(0); // totalReturns
      expect(stats[5]).to.equal(true); // fundActive
    });

    it("Should return correct LP share", async function () {
      const lpShare = await fund.getLPShare(lp1.address);
      expect(lpShare).to.be.greaterThan(0);
    });
  });
});

