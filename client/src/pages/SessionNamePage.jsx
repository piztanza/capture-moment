import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const SessionNamePage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupProgress, setSetupProgress] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!sessionName.trim()) {
      setError('Please enter a session name')
      return
    }

    setLoading(true)
    setError('')
    setCurrentStep(0)
    setSetupProgress('Creating session...')

    // Simulate progress updates
    const progressSteps = [
      'Creating session...'
    ]

    const progressInterval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1
        if (nextStep < progressSteps.length) {
          setSetupProgress(progressSteps[nextStep])
          return nextStep
        }
        return prev
      })
    }, 800)

    try {
      const response = await fetch(`/api/start-session/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_name: sessionName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start session')
      }

      const data = await response.json()
      
      // Clear progress interval and show success
      clearInterval(progressInterval)
      setSetupProgress('Session created successfully!')
      setCurrentStep(progressSteps.length)
      
      // Log session setup information
      console.log('🎬 Session started successfully!')
      console.log(`📁 Session folder created: ${data.session_folder_path}`)
      console.log(`🎯 OBS recording directory set: ${data.obs_path_set ? 'Success' : 'Failed'}`)
      
      // Check OBS connection status
      if (!data.obs_connected) {
        console.warn('⚠️ OBS WebSocket connection failed, but session was created successfully')
        console.warn('📝 Replay capture will use fallback method (F9 keypress)')
      } else if (!data.obs_path_set) {
        console.warn('⚠️ OBS connected but recording directory setting failed')
        console.warn('📝 Replays may be saved to default OBS directory')
      } else {
        console.log('✅ OBS recording directory configured - both recordings and replay buffers will save to session folder')
        console.log('🎬 Replay buffer automatically started/restarted for this session')
        console.log(`📂 Save location: ${data.session_folder_path}`)
      }
      
      // Show completion message and wait 5 seconds before navigating
      setSetupProgress('Session created successfully!')
      setCurrentStep(progressSteps.length - 1) // Show final step as completed
      
      setTimeout(() => {
        setLoading(false) // Hide loading screen just before navigation
        navigate(`/session/${sessionId}`)
      }, 5000)
      
    } catch (err) {
      clearInterval(progressInterval)
      setError(err.message)
      setSetupProgress('')
      setLoading(false) // Only hide loading on error
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2>Setting Up Your Session</h2>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px auto'
          }}></div>
          
          <h3 style={{ marginBottom: '10px', color: '#333' }}>
            {setupProgress || 'Preparing session...'}
          </h3>
          

        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Name Your Session</h2>
      <p>Give your session a memorable name</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            className="form-input"
            placeholder="Enter session name (e.g., 'Morning Training', 'Team Practice')"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            maxLength={50}
            disabled={loading}
          />
        </div>
        
        {error && (
          <p style={{ color: '#f44336', marginBottom: '20px' }}>
            {error}
          </p>
        )}
        
        <button 
          type="submit" 
          className="btn btn-large"
          disabled={loading || !sessionName.trim()}
        >
          {loading ? 'Starting Session...' : 'Start Session'}
        </button>
      </form>
      
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginTop: '20px' }}
      >
        Cancel
      </button>
    </div>
  )
}

export default SessionNamePage
