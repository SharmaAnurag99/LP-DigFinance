import React from 'react';
import { InvestmentEntry, FundMetrics } from '../utils/contracts';

interface StartupPortalProps {
  investments: InvestmentEntry[];
  fundStatsMap: Record<string, FundMetrics>;
}

const formatNumber = (value: string) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString();

const StartupPortal: React.FC<StartupPortalProps> = ({ investments, fundStatsMap }) => {
  const totalReceived = investments.reduce((acc, record) => acc + Number(record.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-700 font-medium">Capital Received</p>
          </div>
          <p className="text-3xl font-bold text-amber-900 mt-2">
            {formatNumber(totalReceived.toString())} mUSDC
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm text-blue-600 font-medium">Active VC Relationships</p>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2">
            {new Set(investments.map((record) => record.fundAddress)).size}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-sm text-green-600 font-medium">Next Steps</p>
          </div>
          <p className="text-base text-green-900 mt-2 font-semibold">
            Return proceeds via the fund dashboard when milestones are hit.
          </p>
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Investment History
        </h3>
        {investments.length === 0 ? (
          <p className="text-sm text-gray-500">
            Once a VC deploys capital into your startup, the complete audit trail will show up here.
          </p>
        ) : (
          <div className="space-y-3">
            {investments.map((investment, index) => (
              <div
                key={`${investment.fundAddress}-${investment.timestamp}-${index}`}
                className="border border-gray-100 rounded-xl p-4 flex items-center justify-between bg-white hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatNumber(investment.amount)} mUSDC from Fund {investment.fundAddress.slice(0, 6)}...
                    {investment.fundAddress.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-500">{investment.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(investment.timestamp)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Fund Balance</p>
                  <p className="font-semibold">
                    {formatNumber(fundStatsMap[investment.fundAddress]?.contractBalance || '0')} mUSDC
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-dashed border-gray-200 rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Demo the Startup View</h3>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>Connect MetaMask with the startup wallet (e.g., Account 4 from Hardhat).</li>
          <li>Show the investments the startup has already received and highlight descriptions.</li>
          <li>Explain how the startup returns capital by sending funds back to the VC, who records it via the dashboard.</li>
        </ol>
      </div>
    </div>
  );
};

export default StartupPortal;

