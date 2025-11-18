import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  getFundContract,
  getFundTokenContract,
  getMockUSDCContract,
  formatTokenAmount,
  parseTokenAmount,
} from '../utils/contracts';
import ConnectWallet from '../components/ConnectWallet';
import { useWallet } from '../hooks/useWallet';

const FundDetails: React.FC = () => {
  const { fundAddress } = useParams<{ fundAddress: string }>();
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const [stats, setStats] = useState<any>(null);
  const [isVCManager, setIsVCManager] = useState(false);
  const [lpTokenBalance, setLpTokenBalance] = useState('0');
  const [lpShare, setLpShare] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [investStartup, setInvestStartup] = useState('');
  const [investAmount, setInvestAmount] = useState('');
  const [investDescription, setInvestDescription] = useState('');
  const [returnsAmount, setReturnsAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (fundAddress && wallet.isConnected) {
      loadFundData();
    }
  }, [fundAddress, wallet.isConnected, wallet.address]);

  const loadFundData = async () => {
    if (!fundAddress || !wallet.address) return;

    try {
      const fundContract = await getFundContract(fundAddress);
      if (!fundContract) return;

      const [fundStats, vcManager, lpTokenAddress] = await Promise.all([
        fundContract.getFundStats(),
        fundContract.vcManager(),
        fundContract.lpToken(),
      ]);

      setIsVCManager(vcManager.toLowerCase() === wallet.address.toLowerCase());

      setStats({
        totalDeposited: formatTokenAmount(fundStats[0], 6),
        totalInvested: formatTokenAmount(fundStats[1], 6),
        totalReturns: formatTokenAmount(fundStats[2], 6),
        contractBalance: formatTokenAmount(fundStats[3], 6),
        lpTokenSupply: formatTokenAmount(fundStats[4], 18),
        fundActive: fundStats[5],
      });

      // Load LP token balance
      const lpTokenContract = await getFundTokenContract(lpTokenAddress);
      if (lpTokenContract) {
        const balance = await lpTokenContract.balanceOf(wallet.address);
        setLpTokenBalance(formatTokenAmount(balance, 18));

        const share = await fundContract.getLPShare(wallet.address);
        setLpShare(formatTokenAmount(share, 6));
      }

      // Load USDC balance
      const usdcContract = await getMockUSDCContract();
      if (usdcContract) {
        const balance = await usdcContract.balanceOf(wallet.address);
        setUsdcBalance(formatTokenAmount(balance, 6));
      }
    } catch (error) {
      console.error('Error loading fund data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAddress || !wallet.isConnected) return;

    setActionLoading(true);
    setError(null);

    try {
      const amount = parseTokenAmount(depositAmount, 6);
      const usdcContract = await getMockUSDCContract();
      const fundContract = await getFundContract(fundAddress);

      if (!usdcContract || !fundContract) throw new Error('Failed to get contracts');

      // Approve
      const approveTx = await usdcContract.approve(fundAddress, amount);
      await approveTx.wait();

      // Deposit
      const depositTx = await fundContract.deposit(amount);
      await depositTx.wait();

      setDepositAmount('');
      await loadFundData();
    } catch (err: any) {
      console.error('Error depositing:', err);
      setError(err.message || 'Failed to deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAddress || !wallet.isConnected) return;

    setActionLoading(true);
    setError(null);

    try {
      const amount = parseTokenAmount(investAmount, 6);
      const fundContract = await getFundContract(fundAddress);

      if (!fundContract) throw new Error('Failed to get contract');
      if (!ethers.isAddress(investStartup)) throw new Error('Invalid startup address');

      const investTx = await fundContract.invest(investStartup, amount, investDescription);
      await investTx.wait();

      setInvestStartup('');
      setInvestAmount('');
      setInvestDescription('');
      await loadFundData();
    } catch (err: any) {
      console.error('Error investing:', err);
      setError(err.message || 'Failed to invest');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepositReturns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAddress || !wallet.isConnected) return;

    setActionLoading(true);
    setError(null);

    try {
      const amount = parseTokenAmount(returnsAmount, 6);
      const usdcContract = await getMockUSDCContract();
      const fundContract = await getFundContract(fundAddress);

      if (!usdcContract || !fundContract) throw new Error('Failed to get contracts');

      // Approve
      const approveTx = await usdcContract.approve(fundAddress, amount);
      await approveTx.wait();

      // Deposit returns
      const depositTx = await fundContract.depositReturns(amount);
      await depositTx.wait();

      setReturnsAmount('');
      await loadFundData();
    } catch (err: any) {
      console.error('Error depositing returns:', err);
      setError(err.message || 'Failed to deposit returns');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDistributeReturns = async () => {
    if (!fundAddress || !wallet.isConnected) return;

    setActionLoading(true);
    setError(null);

    try {
      const fundContract = await getFundContract(fundAddress);
      if (!fundContract) throw new Error('Failed to get contract');

      const tx = await fundContract.distributeReturns();
      await tx.wait();

      await loadFundData();
    } catch (err: any) {
      console.error('Error distributing returns:', err);
      setError(err.message || 'Failed to distribute returns');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAddress || !wallet.isConnected) return;

    setActionLoading(true);
    setError(null);

    try {
      const amount = parseTokenAmount(withdrawAmount, 18);
      const fundContract = await getFundContract(fundAddress);

      if (!fundContract) throw new Error('Failed to get contract');

      const withdrawTx = await fundContract.lpWithdraw(amount);
      await withdrawTx.wait();

      setWithdrawAmount('');
      await loadFundData();
    } catch (err: any) {
      console.error('Error withdrawing:', err);
      setError(err.message || 'Failed to withdraw');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fund data...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Fund not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-gray-800 hover:text-primary-600"
            >
              VC Fund Platform
            </button>
            <ConnectWallet />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Indicator */}
        {wallet.isConnected && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isVCManager 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-600 text-white'
              }`}>
                {isVCManager ? '👔 VC Manager' : '💰 Limited Partner'}
              </div>
              <p className="text-sm text-gray-600">
                {isVCManager 
                  ? 'You can manage investments, deposit returns, and distribute carry'
                  : 'You can deposit capital, view your position, and withdraw returns'}
              </p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Fund {fundAddress?.slice(0, 6)}...{fundAddress?.slice(-4)}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  stats.fundActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {stats.fundActive ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Fund Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium">Total Deposited</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">{parseFloat(stats.totalDeposited).toLocaleString()} mUSDC</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <p className="text-sm text-purple-600 font-medium">Total Invested</p>
                  <p className="text-2xl font-bold text-purple-900 mt-2">{parseFloat(stats.totalInvested).toLocaleString()} mUSDC</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-green-600 font-medium">Returns</p>
                  <p className="text-2xl font-bold text-green-700 mt-2">
                    {parseFloat(stats.totalReturns).toLocaleString()} mUSDC
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <p className="text-sm text-indigo-600 font-medium">Contract Balance</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-2">{parseFloat(stats.contractBalance).toLocaleString()} mUSDC</p>
                </div>
              </div>
            </div>

            {/* LP Info */}
            {wallet.isConnected && !isVCManager && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-100 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Your LP Position
                </h3>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">LP Token Balance:</span>
                    <span className="font-bold text-gray-900">{parseFloat(lpTokenBalance).toLocaleString()}</span>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Your Share:</span>
                    <span className="font-bold text-green-700">{parseFloat(lpShare).toLocaleString()} mUSDC</span>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">USDC Balance:</span>
                    <span className="font-bold text-gray-900">{parseFloat(usdcBalance).toLocaleString()} mUSDC</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-6">
            {/* Deposit (LP) */}
            {wallet.isConnected && !isVCManager && (
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Deposit Capital
                </h3>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (mUSDC)</label>
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="1000"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    {actionLoading ? 'Processing...' : 'Deposit'}
                  </button>
                </form>
              </div>
            )}

            {/* Withdraw (LP) */}
            {wallet.isConnected && !isVCManager && parseFloat(lpTokenBalance) > 0 && (
              <div className="bg-gradient-to-br from-white to-red-50 rounded-xl shadow-lg border border-red-100 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Withdraw
                </h3>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LP Tokens</label>
                    <input
                      type="text"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="1000"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">Max: {parseFloat(lpTokenBalance).toLocaleString()}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 disabled:opacity-50 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    {actionLoading ? 'Processing...' : 'Withdraw'}
                  </button>
                </form>
              </div>
            )}

            {/* Invest (VC) */}
            {wallet.isConnected && isVCManager && (
              <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-purple-100 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Invest in Startup
                </h3>
                <form onSubmit={handleInvest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Startup Address</label>
                    <input
                      type="text"
                      value={investStartup}
                      onChange={(e) => setInvestStartup(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0x..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (mUSDC)</label>
                    <input
                      type="text"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="10000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={investDescription}
                      onChange={(e) => setInvestDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Investment description..."
                      rows={3}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    {actionLoading ? 'Processing...' : 'Invest'}
                  </button>
                </form>
              </div>
            )}

            {/* Deposit Returns (VC) */}
            {wallet.isConnected && isVCManager && (
              <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg border border-green-100 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Deposit Returns
                </h3>
                <form onSubmit={handleDepositReturns} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (mUSDC)</label>
                    <input
                      type="text"
                      value={returnsAmount}
                      onChange={(e) => setReturnsAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="5000"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    {actionLoading ? 'Processing...' : 'Deposit Returns'}
                  </button>
                </form>
              </div>
            )}

            {/* Distribute Returns (VC) */}
            {wallet.isConnected && isVCManager && parseFloat(stats.totalReturns) > 0 && (
              <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-purple-100 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Distribute Returns
                </h3>
                <div className="bg-purple-100 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-700 font-medium">
                    Pending Returns: <span className="font-bold">{parseFloat(stats.totalReturns).toLocaleString()} mUSDC</span>
                  </p>
                </div>
                <button
                  onClick={handleDistributeReturns}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  {actionLoading ? 'Processing...' : 'Distribute Returns'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FundDetails;

