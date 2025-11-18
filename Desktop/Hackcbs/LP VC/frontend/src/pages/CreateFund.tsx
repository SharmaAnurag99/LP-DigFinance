import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFundFactoryContract, getContractAddresses } from '../utils/contracts';
import { isVCManagerAddress } from '../utils/roleDetection';
import ConnectWallet from '../components/ConnectWallet';
import { useWallet } from '../hooks/useWallet';

const CreateFund: React.FC = () => {
  const [carriedInterest, setCarriedInterest] = useState('20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { wallet } = useWallet();

  // Redirect if not VC Manager
  useEffect(() => {
    if (wallet.isConnected && !isVCManagerAddress(wallet.address)) {
      navigate('/');
    }
  }, [wallet.isConnected, wallet.address, navigate]);

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addresses = getContractAddresses();
      const factoryContract = await getFundFactoryContract();
      if (!factoryContract) {
        throw new Error('Failed to get factory contract');
      }

      const carryPercent = parseInt(carriedInterest);
      if (isNaN(carryPercent) || carryPercent < 0 || carryPercent > 100) {
        throw new Error('Carried interest must be between 0 and 100');
      }

      const tx = await factoryContract.createFund(addresses.mockUSDC, carryPercent);
      await tx.wait();

      navigate('/');
    } catch (err: any) {
      console.error('Error creating fund:', err);
      setError(err.message || 'Failed to create fund');
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Please connect your wallet to create a fund</p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  if (!isVCManagerAddress(wallet.address)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            Only VC Manager accounts can create funds.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please connect with a VC Manager wallet address.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">VC Fund Platform</h1>
            </div>
            <ConnectWallet />
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Badge */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-90">VC Manager</p>
              <p className="text-lg font-semibold">Create a New Fund</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Fund
          </h2>

          <form onSubmit={handleCreateFund} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carried Interest Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={carriedInterest}
                onChange={(e) => setCarriedInterest(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="20"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                The percentage of profits that goes to the VC manager (0-100)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg"
              >
                {loading ? 'Creating...' : 'Create Fund'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateFund;

