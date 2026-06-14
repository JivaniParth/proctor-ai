import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar.jsx'
import { Landing } from './pages/Landing.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { ExamClient } from './pages/ExamClient.jsx'
import { ExamSetup } from './pages/ExamSetup.jsx'
import { PrivacyPolicy } from './pages/PrivacyPolicy.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam" element={<ExamClient />} />
        <Route path="/setup" element={<ExamSetup />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    </BrowserRouter>
  )
}
