import React, { useState, useEffect } from 'react';
import { getFundContract, formatTokenAmount } from '../utils/contracts';
import { useNavigate } from 'react-router-dom';

interface FundCardProps {
  fundAddress: string;
}

interface FundStats {
  totalDeposited: string;
  totalInvested: string;
  totalReturns: string;
  contractBalance: string;
  lpTokenSupply: string;
  fundActive: boolean;
}

const FundCard: React.FC<FundCardProps> = ({ fundAddress }) => {
  const [stats, setStats] = useState<FundStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const fundContract = await getFundContract(fundAddress);
        if (!fundContract) return;

        const fundStats = await fundContract.getFundStats();
        setStats({
          totalDeposited: formatTokenAmount(fundStats[0], 6),
          totalInvested: formatTokenAmount(fundStats[1], 6),
          totalReturns: formatTokenAmount(fundStats[2], 6),
          contractBalance: formatTokenAmount(fundStats[3], 6),
          lpTokenSupply: formatTokenAmount(fundStats[4], 18),
          fundActive: fundStats[5],
        });
      } catch (error) {
        console.error('Error loading fund stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fundAddress]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
      onClick={() => navigate(`/fund/${fundAddress}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Fund {fundAddress.slice(0, 6)}...{fundAddress.slice(-4)}
          </h3>
          <p className={`text-sm ${stats.fundActive ? 'text-green-600' : 'text-red-600'}`}>
            {stats.fundActive ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Deposited:</span>
          <span className="font-semibold">{parseFloat(stats.totalDeposited).toLocaleString()} mUSDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Invested:</span>
          <span className="font-semibold">{parseFloat(stats.totalInvested).toLocaleString()} mUSDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Returns:</span>
          <span className="font-semibold text-green-600">
            {parseFloat(stats.totalReturns).toLocaleString()} mUSDC
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Balance:</span>
          <span className="font-semibold">{parseFloat(stats.contractBalance).toLocaleString()} mUSDC</span>
        </div>
      </div>

      <button
        className="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/fund/${fundAddress}`);
        }}
      >
        View Details
      </button>
    </div>
  );
};

export default FundCard;

