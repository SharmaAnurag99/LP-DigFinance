# LP Venture Capital Platform Guide

## 1. Overview / परिचय
- FundFactory VC managers ko naye LP-backed funds create karne deta hai.  
- Fund contract LP deposits, startup investments, returns distribution aur withdrawals ko handle karta hai.  
- FundToken har fund ka LP share ERC20 token hai.  

## 2. Contracts Workflow / कॉन्ट्रैक्ट फ्लो
- `FundFactory.createFund(stablecoin, carry)` → naya `Fund` + `FundToken`, ownership Fund ko milti hai.  
- LPs `Fund.deposit(amount)` se stablecoin bhejte hain; proportional LP tokens mint hote hain.  
- VC manager hi `invest`, `depositReturns`, `distributeReturns` chala sakta hai (custom errors + modifiers ensure karo).  
- LP withdrawal `lpWithdraw(lpTokenAmount)` se net asset value alapján funds wapas milte hain.  

## 3. Dev Setup / डेवलप सेटअप
```
cd /Users/anuragsharma/Desktop/Hackcbs/LP\ VC
npm install
cd frontend && npm install
```

## 4. Compile & Test / कंपाइल और टेस्ट
```
cd /Users/anuragsharma/Desktop/Hackcbs/LP\ VC
npx hardhat compile
npx hardhat test
```
Tests cover deposits, investments, returns, withdrawals aur statistics; gas optimizations ke custom errors already assert hote hain.

## 5. Deployment / डिप्लॉयमेंट
1. Hardhat network choose karo (e.g. `--network sepolia`).  
2. `npx hardhat run scripts/deploy-testnet.js --network <network>` ya prod ke लिए `scripts/deploy.js`.  
3. Console output se `FundFactory`, `Fund`, `FundToken` addresses note karo.  
4. `frontend/src/utils/contractAddresses.json` update karo.  
5. (Optional) Explorer verify: `npx hardhat verify --network <network> <address> <constructor args...>`.  

## 6. Simulation & Demo / सिमुलेशन कैसे दिखाएँ
1. **Bootstrap funds**: `npx hardhat run scripts/setup-testnet-demo.js --network <network>` (VC + LP wallets seed).  
2. **Test flow**: `npx hardhat run scripts/test-flow.js --network <network>` – deposits → investment → returns → withdrawal end-to-end walkthrough.  
3. Agar poora local demo chahiye, Hardhat node start karo (`npx hardhat node`) then scripts ko `--network localhost` ke saath run karo.  
4. Data check ke लिए `npx hardhat console --network <network>` open karke `await fund.getFundStats()` etc call karo.  

## 7. Frontend Functionality / फ्रंटएंड फीचर्स
- `Home` dashboard: platform intro + CTA buttons.  
- `CreateFund` page: VC wallet connect karke FundFactory ko call karta hai (stablecoin addr + carry input).  
- `FundDetails` view: selected fund ke deposits/investments/distributions list + LP share calculator.  
- `LPDashboard`: LP deposits, withdrawal requests aur activity timeline.  
- `VCDashboard`: available balance, startup investments, return distribution controls.  
- `StartupPortal`: funded startups apne received investments track kar sakte hain (read-only).  
- Wallet handling `frontend/src/hooks/useWallet.ts` + `components/ConnectWallet.tsx` mein hai.  

## 8. Frontend Build/Test / फ्रंटएंड बिल्ड
```
cd /Users/anuragsharma/Desktop/Hackcbs/LP\ VC/frontend
npm run dev      # local preview
npm run build    # production assets (dist recreate karega)
npm run preview  # build verify
```

## 9. Verification Checklist / चेकलिस्ट
- [ ] Hardhat compile/test green.  
- [ ] Deploy script output saved + addresses frontend config mein.  
- [ ] Frontend env (Vite) mein RPC/chain IDs set.  
- [ ] Demo scripts `setup-testnet-demo` & `test-flow` successfully run.  
- [ ] UI flows (VC create fund, LP deposit, VC invest, returns distribute, LP withdraw) walkthrough recorded.  

Is README ko latest reference banakar rakho; kisi aur documentation ki आवश्यकता नहीं रही. Good luck! 🚀  

