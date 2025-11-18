import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  getFundFactoryContract,
  getFundSnapshot,
  getFundContract,
  getFundTokenContract,
  getLPActivitiesForFund,
  getInvestmentHistoryForFund,
  getReturnHistoryForFund,
  getDistributionHistoryForFund,
  getStartupInvestmentsForFund,
  FundMetrics,
  FundSnapshot,
  LPActivityEntry,
  InvestmentEntry,
  ReturnEntry,
  DistributionEntry,
  formatTokenAmount,
} from '../utils/contracts';
import { detectRoleByAddress, isVCManagerAddress } from '../utils/roleDetection';
import FundCard from '../components/FundCard';
import ConnectWallet from '../components/ConnectWallet';
import { useWallet } from '../hooks/useWallet';
import LPDashboard, { LPPosition } from './LPDashboard';
import VCDashboard from './VCDashboard';
import StartupPortal from './StartupPortal';

type RoleView = 'guest' | 'vc' | 'lp' | 'startup';

const roleLabels: Record<RoleView, string> = {
  guest: 'Overview',
  vc: 'VC Manager',
  lp: 'Limited Partner',
  startup: 'Startup',
};

const Home: React.FC = () => {
  const [funds, setFunds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundStatsMap, setFundStatsMap] = useState<Record<string, FundMetrics>>({});
  const [managedFunds, setManagedFunds] = useState<FundSnapshot[]>([]);
  const [lpActivities, setLpActivities] = useState<LPActivityEntry[]>([]);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [vcInvestments, setVcInvestments] = useState<InvestmentEntry[]>([]);
  const [vcReturnHistory, setVcReturnHistory] = useState<ReturnEntry[]>([]);
  const [vcDistributionHistory, setVcDistributionHistory] = useState<DistributionEntry[]>([]);
  const [startupInvestments, setStartupInvestments] = useState<InvestmentEntry[]>([]);
  const [lpFundInvestments, setLpFundInvestments] = useState<Record<string, InvestmentEntry[]>>({});
  const [availableRoles, setAvailableRoles] = useState<RoleView[]>(['guest']);
  const [activeRole, setActiveRole] = useState<RoleView>('guest');
  const [contractsDeployed, setContractsDeployed] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const renderRoleDashboard = () => {
    if (!wallet.isConnected) {
      return <p className="text-gray-600">Connect your wallet to see personalized dashboards.</p>;
    }

    if (activeRole === 'vc') {
      return managedFunds.length > 0 ? (
        <VCDashboard
          funds={managedFunds}
          investments={vcInvestments}
          returns={vcReturnHistory}
          distributions={vcDistributionHistory}
          onCreateFund={() => navigate('/create-fund')}
        />
      ) : (
        <p className="text-gray-600">
          You haven't created a fund yet. Use the "Create Fund" action to start raising LP capital.
        </p>
      );
    }

    if (activeRole === 'lp') {
      return lpActivities.length > 0 || lpPositions.length > 0 ? (
        <LPDashboard 
          positions={lpPositions} 
          activities={lpActivities}
          fundInvestments={lpFundInvestments}
        />
      ) : (
        <p className="text-gray-600">
          No LP deposits recorded. Contribute to a fund to unlock your investment timeline.
        </p>
      );
    }

    if (activeRole === 'startup') {
      return startupInvestments.length > 0 ? (
        <StartupPortal investments={startupInvestments} fundStatsMap={fundStatsMap} />
      ) : (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-8 text-center">
          <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-amber-900 mb-2">No Investments Received Yet</h3>
          <p className="text-amber-700 mb-4">
            This wallet address ({wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}) has not received any VC investments yet.
          </p>
          <div className="bg-white rounded-lg p-4 text-left max-w-2xl mx-auto">
            <p className="text-sm text-gray-700 mb-2"><strong>To receive investments:</strong></p>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Share your wallet address with the VC Manager</li>
              <li>The VC will invest in your startup using this address</li>
              <li>Once invested, your investments will appear here automatically</li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              <strong>Your address:</strong> {wallet.address}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-gray-600">
        Select a role tab to highlight VC, LP, or Startup specific journeys once on-chain data exists.
      </div>
    );
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!wallet.isConnected || !wallet.address) {
        setFunds([]);
        setFundStatsMap({});
        setManagedFunds([]);
        setLpActivities([]);
        setLpPositions([]);
        setVcInvestments([]);
        setVcReturnHistory([]);
        setVcDistributionHistory([]);
        setStartupInvestments([]);
        setLpFundInvestments({});
        setAvailableRoles(['guest']);
        setActiveRole('guest');
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const factoryContract = await getFundFactoryContract();
        if (!factoryContract) {
          console.warn('FundFactory contract not available. Make sure contracts are deployed.');
          setContractsDeployed(false);
          setLoading(false);
          return;
        }
        setContractsDeployed(true);

        let allFunds: string[] = [];
        try {
          allFunds = await factoryContract.getAllFunds();
          // Filter out zero addresses if any
          allFunds = allFunds.filter(addr => addr && addr !== ethers.ZeroAddress);
        } catch (error: any) {
          console.warn('Error calling getAllFunds:', error.message);
          // If contract exists but call fails, try getFundCount as fallback
          try {
            const fundCount = await factoryContract.getFundCount();
            if (fundCount > 0n) {
              const funds: string[] = [];
              for (let i = 0; i < Number(fundCount); i++) {
                const fundAddr = await factoryContract.funds(i);
                if (fundAddr && fundAddr !== ethers.ZeroAddress) {
                  funds.push(fundAddr);
                }
              }
              allFunds = funds;
            }
          } catch (fallbackError) {
            console.warn('Fallback method also failed:', fallbackError);
            allFunds = [];
          }
        }
        setFunds(allFunds);

        const snapshotResults = await Promise.all(allFunds.map((address) => getFundSnapshot(address)));
        const snapshots = snapshotResults.filter((snapshot): snapshot is FundSnapshot => Boolean(snapshot));

        const statsMap = snapshots.reduce((acc, snapshot) => {
          acc[snapshot.fundAddress] = snapshot.stats;
          return acc;
        }, {} as Record<string, FundMetrics>);
        setFundStatsMap(statsMap);

        const managed = snapshots.filter(
          (snapshot) => snapshot.vcManager.toLowerCase() === wallet.address!.toLowerCase()
        );
        setManagedFunds(managed);

        const lpActivityResults = await Promise.all(
          snapshots.map((snapshot) => getLPActivitiesForFund(snapshot.fundAddress, wallet.address!))
        );
        const lpActivityFlat = lpActivityResults.flat().sort((a, b) => b.timestamp - a.timestamp);
        setLpActivities(lpActivityFlat);

        const lpPositionResults = await Promise.all(
          snapshots.map(async (snapshot) => {
            const fundContract = await getFundContract(snapshot.fundAddress);
            const lpTokenContract = await getFundTokenContract(snapshot.lpTokenAddress);
            if (!fundContract || !lpTokenContract) return null;

            const balance = await lpTokenContract.balanceOf(wallet.address);
            if (balance === 0n) {
              return null;
            }

            const lpShareRaw = await fundContract.getLPShare(wallet.address);
            return {
              fundAddress: snapshot.fundAddress,
              lpTokenBalance: formatTokenAmount(balance, 18),
              lpShare: formatTokenAmount(lpShareRaw, 6),
              stats: snapshot.stats,
            } as LPPosition;
          })
        );
        const lpPositionFiltered = lpPositionResults.filter((position): position is LPPosition => Boolean(position));
        setLpPositions(lpPositionFiltered);

        const vcInvestmentResults = await Promise.all(
          managed.map((snapshot) => getInvestmentHistoryForFund(snapshot.fundAddress))
        );
        setVcInvestments(vcInvestmentResults.flat().sort((a, b) => b.timestamp - a.timestamp));

        const returnResults = await Promise.all(
          managed.map((snapshot) => getReturnHistoryForFund(snapshot.fundAddress))
        );
        setVcReturnHistory(returnResults.flat().sort((a, b) => b.timestamp - a.timestamp));

        const distributionResults = await Promise.all(
          managed.map((snapshot) => getDistributionHistoryForFund(snapshot.fundAddress))
        );
        setVcDistributionHistory(distributionResults.flat().sort((a, b) => b.timestamp - a.timestamp));

        const startupResults = await Promise.all(
          snapshots.map((snapshot) => getStartupInvestmentsForFund(snapshot.fundAddress, wallet.address!))
        );
        const startupFlat = startupResults.flat().sort((a, b) => b.timestamp - a.timestamp);
        setStartupInvestments(startupFlat);

        // Get investments for funds where LP has positions (for fund tracking)
        const lpFundInvestmentResults = await Promise.all(
          lpPositionFiltered.map(async (position) => {
            const investments = await getInvestmentHistoryForFund(position.fundAddress);
            return { fundAddress: position.fundAddress, investments };
          })
        );
        const lpFundInvestmentsMap = lpFundInvestmentResults.reduce((acc, result) => {
          acc[result.fundAddress] = result.investments.sort((a, b) => b.timestamp - a.timestamp);
          return acc;
        }, {} as Record<string, InvestmentEntry[]>);
        setLpFundInvestments(lpFundInvestmentsMap);

        // Auto-detect role based on wallet address (known Hardhat addresses)
        const detectedRole = detectRoleByAddress(wallet.address);
        console.log('🔍 Role Detection:', { address: wallet.address, detectedRole });
        
        const derivedRoles: RoleView[] = [];
        
        // Add roles based on on-chain data
        if (managed.length > 0) derivedRoles.push('vc');
        if (lpPositionFiltered.length > 0 || lpActivityFlat.length > 0) derivedRoles.push('lp');
        if (startupFlat.length > 0) derivedRoles.push('startup');
        
        // If we detected a role from address but no on-chain data yet, add it
        if (detectedRole !== 'guest' && !derivedRoles.includes(detectedRole)) {
          derivedRoles.push(detectedRole);
        }
        
        // If still no roles and wallet connected, show all roles for manual selection
        if (derivedRoles.length === 0 && wallet.isConnected) {
          derivedRoles.push('vc', 'lp', 'startup');
        }
        
        if (derivedRoles.length === 0) derivedRoles.push('guest');

        setAvailableRoles(derivedRoles);
        
        // Auto-select role based on detected address (prioritize detected role)
        let roleToSet: RoleView;
        if (detectedRole !== 'guest' && derivedRoles.includes(detectedRole)) {
          roleToSet = detectedRole;
        } else {
          roleToSet = derivedRoles[0];
        }
        
        console.log('✅ Setting role:', { derivedRoles, roleToSet, detectedRole });
        setActiveRole(roleToSet);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, [wallet.isConnected, wallet.address]);

  // Reset active role when wallet address changes
  useEffect(() => {
    if (wallet.address) {
      setActiveRole('guest'); // Will be updated by loadDashboardData
    }
  }, [wallet.address]);

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Role Badge Banner */}
        {wallet.isConnected && (
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm opacity-90">Current Role</p>
                  <h2 className="text-3xl font-bold mt-1">{roleLabels[activeRole]}</h2>
                  <p className="text-sm opacity-75 mt-1">
                    {activeRole === 'vc' && 'Manage funds, investments, and carry distribution'}
                    {activeRole === 'lp' && 'Track deposits, returns, and withdrawals'}
                    {activeRole === 'startup' && 'View received investments and fund status'}
                    {activeRole === 'guest' && 'Connect wallet to see personalized dashboards'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeRole === role
                        ? 'bg-white text-blue-600 shadow-lg scale-105'
                        : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500 font-semibold">Role-based control center</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                {wallet.isConnected ? `${roleLabels[activeRole]} Dashboard` : 'Connect to unlock dashboards'}
              </h2>
            </div>
          </div>
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-500">Loading personalized data...</span>
              </div>
            ) : (
              renderRoleDashboard()
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">All Funds</h2>
            <p className="text-sm text-gray-500 mt-1">Live on-chain stats auto-refresh every 15 seconds.</p>
          </div>
          {wallet.isConnected && isVCManagerAddress(wallet.address) && (
            <button
              onClick={() => navigate('/create-fund')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              + Create Fund
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : contractsDeployed === false ? (
          <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200 p-8">
            <h3 className="text-xl font-semibold text-yellow-800 mb-2">Contracts Not Found</h3>
            <p className="text-yellow-700 mb-4">
              The FundFactory contract is not found at the configured address.
            </p>
            <div className="text-sm text-yellow-600 space-y-2 mb-4">
              <p><strong>Most common causes:</strong></p>
              <ol className="list-decimal list-inside space-y-2 text-left max-w-lg mx-auto">
                <li className="mb-2">
                  <strong>MetaMask is on wrong network</strong>
                  <div className="ml-6 mt-1">
                    • Check MetaMask network dropdown<br/>
                    • Select "Hardhat Local" (Chain ID: 1337)<br/>
                    • If it doesn't exist, add it manually (see START_HERE.md)
                  </div>
                </li>
                <li className="mb-2">
                  <strong>Contracts not deployed</strong>
                  <div className="ml-6 mt-1">
                    • Make sure Hardhat node is running: <code className="bg-yellow-100 px-2 py-1 rounded text-xs">npm run node</code><br/>
                    • Deploy contracts: <code className="bg-yellow-100 px-2 py-1 rounded text-xs">npm run setup:demo</code>
                  </div>
                </li>
                <li className="mb-2">
                  <strong>Hardhat node was restarted</strong>
                  <div className="ml-6 mt-1">
                    • Restarting Hardhat node resets all contracts<br/>
                    • You need to redeploy: <code className="bg-yellow-100 px-2 py-1 rounded text-xs">npm run setup:demo</code>
                  </div>
                </li>
              </ol>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).ethereum) {
                    (window as any).ethereum.request({
                      method: 'wallet_switchEthereumChain',
                      params: [{ chainId: '0x539' }], // 1337 in hex
                    }).catch(() => {
                      alert('Please manually switch to Hardhat Local network in MetaMask');
                    });
                  }
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Switch Network in MetaMask
              </button>
            </div>
          </div>
        ) : funds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No funds created yet.</p>
            {wallet.isConnected && (
              <button
                onClick={() => navigate('/create-fund')}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create First Fund
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funds.map((fundAddress) => (
              <FundCard key={fundAddress} fundAddress={fundAddress} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;

