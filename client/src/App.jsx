import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PaymentPage from './pages/PaymentPage'
import SessionNamePage from './pages/SessionNamePage'
import SessionPage from './pages/SessionPage'
import GalleryPage from './pages/GalleryPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/session-name/:sessionId" element={<SessionNamePage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
          <Route path="/gallery/:sessionId" element={<GalleryPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
