import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FundMetrics, LPActivityEntry, InvestmentEntry, getMockUSDCContract, formatTokenAmount } from '../utils/contracts';
import { useWallet } from '../hooks/useWallet';

export interface LPPosition {
  fundAddress: string;
  lpTokenBalance: string;
  lpShare: string;
  stats: FundMetrics;
}

interface LPDashboardProps {
  positions: LPPosition[];
  activities: LPActivityEntry[];
  fundInvestments?: Record<string, InvestmentEntry[]>;
}

const formatNumber = (value: string) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString();

const LPDashboard: React.FC<LPDashboardProps> = ({ positions, activities, fundInvestments = {} }) => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallet.isConnected || !wallet.address) {
        setUsdcBalance('0');
        setLoadingBalance(false);
        return;
      }

      try {
        const usdcContract = await getMockUSDCContract();
        if (!usdcContract) {
          setUsdcBalance('0');
          setLoadingBalance(false);
          return;
        }

        const balance = await usdcContract.balanceOf(wallet.address);
        setUsdcBalance(formatTokenAmount(balance, 6));
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
        setUsdcBalance('0');
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [wallet.isConnected, wallet.address]);

  const totalDeposited = activities
    .filter((activity) => activity.actionType === 'deposit')
    .reduce((acc, activity) => acc + Number(activity.amount), 0);

  const totalWithdrawn = activities
    .filter((activity) => activity.actionType === 'withdrawal')
    .reduce((acc, activity) => acc + Number(activity.amount), 0);

  const latestActivity = activities[0];

  return (
    <div className="space-y-8">
      {/* mUSDC Balance Display - Prominent at Top */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-90 font-medium">Your mUSDC Balance</p>
              <p className="text-4xl font-bold mt-1">
                {loadingBalance ? (
                  <span className="text-white/70">Loading...</span>
                ) : (
                  <span>{formatNumber(usdcBalance)} mUSDC</span>
                )}
              </p>
              <p className="text-sm opacity-75 mt-1">
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Auto-refreshes every 5s</p>
            <div className="mt-2 flex items-center gap-2 justify-end">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs opacity-75">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm text-blue-600 font-medium">Total Capital Contributed</p>
          </div>
          <p className="text-3xl font-bold text-blue-900 mt-2">
            {formatNumber(totalDeposited.toString())} mUSDC
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <p className="text-sm text-green-600 font-medium">Capital Returned</p>
          </div>
          <p className="text-3xl font-bold text-green-700 mt-2">
            {formatNumber(totalWithdrawn.toString())} mUSDC
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-purple-600 font-medium">Latest Activity</p>
          </div>
          <p className="text-base text-purple-900 mt-2 font-semibold">
            {latestActivity ? `${latestActivity.actionType === 'deposit' ? 'Deposit' : 'Withdrawal'} on ${formatDate(latestActivity.timestamp)}` : 'No activity yet'}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Your Allocations
          </h3>
          <p className="text-sm text-gray-500">LP tokens represent your share of the fund NAV.</p>
        </div>
        {positions.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 font-medium">No active LP positions</p>
            <p className="text-sm text-gray-400 mt-1">Deposit into a fund to start tracking your ownership.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {positions.map((position) => (
              <div key={position.fundAddress} className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">
                    Fund {position.fundAddress.slice(0, 6)}...{position.fundAddress.slice(-4)}
                  </h4>
                  <button
                    onClick={() => navigate(`/fund/${position.fundAddress}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View fund
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">LP Tokens</p>
                    <p className="font-semibold">{formatNumber(position.lpTokenBalance)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Claimable Share</p>
                    <p className="font-semibold text-emerald-600">{formatNumber(position.lpShare)} mUSDC</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fund Deposited</p>
                    <p className="font-semibold">{formatNumber(position.stats.totalDeposited)} mUSDC</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fund Returns</p>
                    <p className="font-semibold">{formatNumber(position.stats.totalReturns)} mUSDC</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Transaction Timeline
          </h3>
          <span className="text-sm text-gray-500">Every deposit, investment, and withdrawal on-chain.</span>
        </div>
        {activities.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 font-medium">No LP activity yet</p>
            <p className="text-sm text-gray-400 mt-1">Once you deposit into a fund, the full timeline will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div
                key={`${activity.fundAddress}-${activity.timestamp}-${index}`}
                className="flex items-center gap-4 border border-gray-100 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 shadow-md hover:shadow-lg transition-shadow"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md ${
                    activity.actionType === 'deposit' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}
                >
                  {activity.actionType === 'deposit' ? '+' : '-'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {activity.actionType === 'deposit' ? 'Deposit' : 'Withdrawal'} ·{' '}
                    {formatNumber(activity.amount)} mUSDC
                  </p>
                  <p className="text-sm text-gray-500">
                    Fund {activity.fundAddress.slice(0, 6)}...{activity.fundAddress.slice(-4)} ·{' '}
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">LP Tokens</p>
                  <p className="font-semibold">{formatNumber(activity.lpTokens)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fund Tracking - Where Your Money Was Invested */}
      {positions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Fund Tracking - Where Your Capital Was Deployed
            </h3>
            <p className="text-sm text-gray-500">See how the VC deployed your capital</p>
          </div>
          
          {Object.keys(fundInvestments).length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-gray-500 font-medium">No investments made yet</p>
              <p className="text-sm text-gray-400 mt-1">The VC hasn't deployed capital from your fund yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => {
                const investments = fundInvestments[position.fundAddress] || [];
                if (investments.length === 0) return null;
                
                return (
                  <div key={position.fundAddress} className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">
                        Fund {position.fundAddress.slice(0, 6)}...{position.fundAddress.slice(-4)}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Your Share:</span> {formatNumber(position.lpShare)} mUSDC
                      </div>
                    </div>
                    <div className="space-y-3">
                      {investments.map((investment: InvestmentEntry, idx: number) => (
                        <div
                          key={`${investment.fundAddress}-${investment.timestamp}-${idx}`}
                          className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <p className="font-semibold text-gray-900">
                                  {formatNumber(investment.amount)} mUSDC Invested
                                </p>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{investment.description}</p>
                              <p className="text-xs text-gray-500">
                                Startup: {investment.startup.slice(0, 6)}...{investment.startup.slice(-4)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">{formatDate(investment.timestamp)}</p>
                            </div>
                            <div className="text-right">
                              <div className="bg-indigo-100 rounded-full px-3 py-1">
                                <p className="text-xs font-medium text-indigo-700">Active</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LPDashboard;

