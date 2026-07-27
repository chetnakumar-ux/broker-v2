import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/app/Dashboard'
import TrackShipmentStep1 from './pages/app/trackshipment/step1'
import TrackShipmentStep2 from './pages/app/trackshipment/step2'
import SearchVet from './pages/app/SearchVet/SearchVet'
import RiskAlerts from './pages/app/riskalert/RiskAlerts'
import LoadSearch from './pages/app/loadsearch/LoadSearch'
import Subscription from './pages/app/subscription/Subscription'

import AppHeader from './components/AppHeader';
import RouteGuard from './RouteGuard'

import { ToastContainer } from './components/ui/Toaster'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />

      <RouteGuard>
        <AppHeader /> 

        <div
          className="min-h-screen"
          style={{
            background:  "linear-gradient(180deg, #F5F2E9 0%, #F8F7F4 30%, #FBFBF8 100%)",  }}
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trackshipment/step1" element={<TrackShipmentStep1 />} />
            <Route path="/trackshipment/step2" element={<TrackShipmentStep2 />} />
            <Route path="/load-search" element={<LoadSearch/>}/>
            <Route path="/search-vet" element={<SearchVet/>}/>
            <Route path ="/risk-alerts" element={<RiskAlerts/>}/>
            <Route path="/subscribe" element={<Subscription />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </RouteGuard>
    </BrowserRouter>
  );
}
export default App