import { Navigate, Route, Routes } from 'react-router-dom'
import { ClinicProvider } from './context/ClinicContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Tracker from './pages/Tracker'

export default function App() {
  return <ClinicProvider><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/clinic/:clinicId/dashboard" element={<Dashboard />} />
    <Route path="/track/:clinicId/:tokenId" element={<Tracker />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></ClinicProvider>
}
