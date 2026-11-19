import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Watch from './pages/Watch'
import Upload from './pages/Upload'
import GoLive from './pages/GoLive'
import Login from './pages/Login'
import Subscriptions from './pages/Subscriptions'
import History from './pages/History'
import WatchLater from './pages/WatchLater'
import Channel from './pages/Channel'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/go-live" element={<GoLive />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/history" element={<History />} />
          <Route path="/watch-later" element={<WatchLater />} />
          <Route path="/channel/:userId" element={<Channel />} />
          <Route path="/login/:token" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
