import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateFund from './pages/CreateFund';
import FundDetails from './pages/FundDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-fund" element={<CreateFund />} />
        <Route path="/fund/:fundAddress" element={<FundDetails />} />
      </Routes>
    </Router>
  );
}

export default App;

