import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleDurationSelect = async (duration) => {
    setLoading(true)
    try {
      const response = await fetch('/api/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      navigate(`/session-name/${data.sessionId}`)
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <h2>Creating Session...</h2>
      </div>
    )
  }

  return (
    <div className="card">
      <h1>Sport Moment Kiosk</h1>
      <p>Select your session duration to get started</p>
      
      <div style={{ marginTop: '40px' }}>
        <button 
          className="btn btn-large"
          onClick={() => handleDurationSelect(30)}
          disabled={loading}
        >
          30 Minutes
        </button>
        
        <button 
          className="btn btn-large"
          onClick={() => handleDurationSelect(60)}
          disabled={loading}
        >
          60 Minutes
        </button>
        
        <button 
          className="btn btn-large"
          onClick={() => handleDurationSelect(120)}
          disabled={loading}
        >
          120 Minutes
        </button>
      </div>
    </div>
  )
}

export default HomePage
