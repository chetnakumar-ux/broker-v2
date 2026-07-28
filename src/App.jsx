import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/app/Dashboard'
import TrackShipmentStep1 from './pages/app/trackshipment/step1'
import TrackShipmentStep2 from './pages/app/trackshipment/step2'
import SearchVet from './pages/app/SearchVet/SearchVet'
import RiskAlerts from './pages/app/riskalert/RiskAlerts'
import LoadSearch from './pages/app/loadsearch/LoadSearch'
// import CarrierSearch from './pages/app/carriers/CarrierSearch'

import UsersList from './pages/app/users/UsersList'


import Subscription from './pages/app/subscription/Subscription'

import AppHeader from './components/AppHeader';
import RouteGuard from './RouteGuard'

import { ToastContainer } from './components/ui/Toaster'
import './App.css'
import ProfileUpdate from './pages/app/profile/ProfileUpdate'
import CarrierSettings from './pages/app/carrier-settings/CarrierSettings'
import CarrierQuestions from './pages/app/carrier-questions/CarrierQuestion'
import ScoringWeights from './pages/app/scoringweight/ScoringWeight'

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
            <Route path="/users" element={<UsersList />} />
            <Route path="/profile" element={<ProfileUpdate/>} />
            <Route path ="/settings/carrier" element={<CarrierSettings/>} />
            <Route path="/subscribe" element={<Subscription />} />
            <Route path ="/carrier-questions" element={<CarrierQuestions />}/>
            {/* <Route path="/carriers/search" element={<CarrierSearch />} /> */}
            <Route path ="/profile/scoring-weights" element={<ScoringWeights />}/>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </RouteGuard>
    </BrowserRouter>
  );
}
export default App