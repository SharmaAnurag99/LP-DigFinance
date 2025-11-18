import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FundSnapshot,
  InvestmentEntry,
  ReturnEntry,
  DistributionEntry,
  getMockUSDCContract,
  formatTokenAmount,
} from '../utils/contracts';
import { useWallet } from '../hooks/useWallet';

interface VCDashboardProps {
  funds: FundSnapshot[];
  investments: InvestmentEntry[];
  returns: ReturnEntry[];
  distributions: DistributionEntry[];
  onCreateFund: () => void;
}

const formatNumber = (value: string) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString();

const VCDashboard: React.FC<VCDashboardProps> = ({
  funds,
  investments,
  returns,
  distributions,
  onCreateFund,
}) => {
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

  const totalCapital = funds.reduce((acc, fund) => acc + Number(fund.stats.totalDeposited), 0);
  const totalDeployed = funds.reduce((acc, fund) => acc + Number(fund.stats.totalInvested), 0);
  const pendingReturns = funds.reduce((acc, fund) => acc + Number(fund.stats.totalReturns), 0);

  return (
    <div className="space-y-10">
      {/* mUSDC Balance Display - Prominent at Top */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-xl p-6 text-white">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm text-blue-600 font-medium">Funds Managed</p>
          </div>
          <p className="text-3xl font-bold text-blue-900 mt-2">{funds.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-purple-600 font-medium">Capital Raised</p>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-2">
            {formatNumber(totalCapital.toString())} mUSDC
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-sm text-green-600 font-medium">Capital Deployed</p>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {formatNumber(totalDeployed.toString())} mUSDC
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-600 font-medium">Pending Returns</p>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            {formatNumber(pendingReturns.toString())} mUSDC
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Managed Funds</h3>
          <p className="text-sm text-gray-500">Jump into any fund to invest or distribute carry.</p>
        </div>
        <button
          onClick={onCreateFund}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Create New Fund
        </button>
      </div>

      {funds.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
          You have not created any funds yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {funds.map((fund) => (
            <div key={fund.fundAddress} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Fund {fund.fundAddress.slice(0, 6)}...{fund.fundAddress.slice(-4)}
                  </h4>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {fund.stats.fundActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/fund/${fund.fundAddress}`)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Manage
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">LP Deposits</p>
                  <p className="font-semibold">{formatNumber(fund.stats.totalDeposited)} mUSDC</p>
                </div>
                <div>
                  <p className="text-gray-500">Deployed</p>
                  <p className="font-semibold">{formatNumber(fund.stats.totalInvested)} mUSDC</p>
                </div>
                <div>
                  <p className="text-gray-500">Pending Returns</p>
                  <p className="font-semibold text-emerald-600">
                    {formatNumber(fund.stats.totalReturns)} mUSDC
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Contract Balance</p>
                  <p className="font-semibold">{formatNumber(fund.stats.contractBalance)} mUSDC</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Investment Activity</h3>
            <p className="text-sm text-gray-500">Chronological log of fund deployments.</p>
          </div>
          {investments.length === 0 ? (
            <p className="text-sm text-gray-500">No investments recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {investments.map((investment, index) => (
                <div key={`${investment.fundAddress}-${investment.timestamp}-${index}`} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <p className="font-semibold text-gray-900">
                    {formatNumber(investment.amount)} mUSDC → {investment.startup.slice(0, 6)}...{investment.startup.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-500">{investment.description}</p>
                  <p className="text-xs text-gray-400">
                    Fund {investment.fundAddress.slice(0, 6)}...{investment.fundAddress.slice(-4)} · {formatDate(investment.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Returns Logged</h3>
            {returns.length === 0 ? (
              <p className="text-sm text-gray-500">No returns deposited yet.</p>
            ) : (
              <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {returns.map((record, index) => (
                  <li key={`${record.fundAddress}-${record.timestamp}-${index}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {formatNumber(record.amount)} mUSDC · Fund {record.fundAddress.slice(0, 6)}...{record.fundAddress.slice(-4)}
                    </span>
                    <span className="text-gray-400">{formatDate(record.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Carry Distributions</h3>
            {distributions.length === 0 ? (
              <p className="text-sm text-gray-500">Distribute returns to showcase automated carry.</p>
            ) : (
              <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {distributions.map((record, index) => (
                  <li key={`${record.fundAddress}-dist-${record.timestamp}-${index}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      LPs {formatNumber(record.lpReturns)} / Carry {formatNumber(record.vcCarry)} · Fund {record.fundAddress.slice(0, 6)}...{record.fundAddress.slice(-4)}
                    </span>
                    <span className="text-gray-400">{formatDate(record.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VCDashboard;

