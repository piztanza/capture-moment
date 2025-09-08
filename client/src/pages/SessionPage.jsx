import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const SessionPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessionData, setSessionData] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState('')
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Session not found')
          } else if (response.status === 403) {
            throw new Error('Session is not active or has expired')
          } else {
            throw new Error('Failed to load session')
          }
        }

        const session = await response.json()
        
        // Validate session status
        if (session.status !== 'active') {
          throw new Error('Session is not active')
        }

        // Check if session has expired
        const startTime = new Date(session.start_time)
        const currentTime = new Date()
        const elapsedMinutes = (currentTime - startTime) / (1000 * 60)
        
        if (elapsedMinutes >= session.duration_minutes) {
          throw new Error('Session has expired')
        }

        setSessionData(session)
        
        // Calculate remaining time
        const remainingMinutes = session.duration_minutes - elapsedMinutes
        setTimeRemaining(Math.max(0, Math.round(remainingMinutes * 60))) // Convert to seconds and round
        
      } catch (err) {
        setError(err.message)
        console.error('Error fetching session:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Session ended
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const formatTime = (seconds) => {
    // Round to nearest second to avoid floating point precision issues
    const totalSeconds = Math.round(seconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // This is the core logic for taking a replay using OBS WebSocket.
  const executeReplayCapture = useCallback(async () => {
    // Prevent multiple simultaneous captures
    if (isCapturing) {
      console.log('Replay capture already in progress, ignoring duplicate request');
      return;
    }

    // Check if session data is available
    if (!sessionData || !sessionData.session_id) {
      console.error('Session data not available:', sessionData);
      // Session data not loaded - error logged to console
      return;
    }

    setIsCapturing(true);
    
    try {
      console.log('Starting OBS replay buffer save for session:', sessionData.session_id);
      
      // Method 1: Try OBS WebSocket API (recommended)
      try {
        const response = await fetch(`/api/obs/save-replay/${sessionData.session_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ OBS replay buffer saved successfully:', data.message);
          // Success logged to console
        } else {
          const errorData = await response.json();
          console.log('❌ OBS WebSocket failed:', errorData.error);
          
          // Show specific error message to user
          let userMessage = 'Failed to save replay via OBS WebSocket. ';
          if (errorData.error.includes('timeout')) {
            userMessage += 'OBS connection timeout - check if OBS is running.';
          } else if (errorData.error.includes('not running')) {
            userMessage += 'OBS Studio is not running.';
          } else if (errorData.error.includes('replay buffer')) {
            userMessage += 'Replay buffer configuration issue in OBS.';
          } else {
            userMessage += errorData.error;
          }
          
          console.log('Falling back to F9 keypress method...');
          userMessage += ' Trying fallback method...';
          
          // Fallback to F9 keypress method
          try {
            const fallbackResponse = await fetch('/api/trigger-replay', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log('✅ F9 keypress fallback triggered:', fallbackData.message);
              // Fallback success logged to console
            } else {
              throw new Error('Fallback method also failed');
            }
          } catch (fallbackError) {
            console.log('❌ F9 keypress fallback also failed:', fallbackError.message);
            // Both methods failed - error logged to console
          }
        }
      } catch (obsError) {
        console.log('❌ OBS WebSocket not available:', obsError.message);
        console.log('Falling back to F9 keypress method...');
        
        // Fallback to F9 keypress method
        try {
          const response = await fetch('/api/trigger-replay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ F9 keypress fallback triggered:', data.message);
            // Fallback success logged to console
          } else {
            throw new Error('Fallback method failed');
          }
        } catch (fallbackError) {
          console.log('❌ F9 keypress fallback also failed:', fallbackError.message);
          // Both methods failed - error logged to console
        }
      }
      
    } catch (error) {
      console.error('Error triggering replay capture:', error);
      // Error logged to console
    } finally {
      // Reset the capturing state after a short delay
      setTimeout(() => {
        setIsCapturing(false);
        console.log('Replay capture completed (setIsCapturing to false)');
      }, 2000); // 2 second cooldown
    }
  }, [isCapturing, sessionData]);


  // Add global F9 key listener
  // useEffect(() => {
  //   const handleKeyPress = (event) => {
  //     if (event.key === 'F9' || event.code === 'F9' || event.keyCode === 120) {
  //       event.preventDefault()
  //       console.log('setIsCapturing is', isCapturing);
  //       // Only trigger if not already capturing
  //       if (!isCapturing) {
  //         console.log('F9 key pressed - triggering replay capture');
  //         executeReplayCapture()
  //       } else {
  //         console.log('F9 key pressed but capture already in progress, ignoring');
  //       }
  //     }
  //   }

  //   // Add event listener
  //   document.addEventListener('keydown', handleKeyPress)
    
  //   // Cleanup
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyPress)
  //   }
  // }, [executeReplayCapture, isCapturing]) // Added isCapturing to dependencies

  const handleEndSession = async () => {
    if (window.confirm('Are you sure you want to end this session?')) {
      try {
        const response = await fetch(`/api/end-session/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('Session ended successfully');
        } else {
          console.error('Failed to end session properly');
        }
      } catch (error) {
        console.error('Error ending session:', error);
      } finally {
        navigate('/');
      }
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading Session...</h2>
      </div>
    )
  }

  if (error || !sessionData) {
    return (
      <div className="card">
        <h2>Session Error</h2>
        <p style={{ color: '#f44336', marginBottom: '20px' }}>
          {error || 'Session not found'}
        </p>
        <button className="btn" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{sessionData.session_name}</h2>
      
      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Session Duration:</strong> {sessionData.duration_minutes} minutes</p>
        <p><strong>Started:</strong> {new Date(sessionData.start_time).toLocaleString()}</p>
        <p>
          <strong>OBS Status:</strong> 
          <span style={{ 
            color: sessionData.obs_connected ? '#4CAF50' : '#f44336',
            fontWeight: 'bold',
            marginLeft: '5px'
          }}>
            {sessionData.obs_connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </p>
        
        {sessionData.session_folder_path && (
          <p>
            <strong>📁 Replay Folder:</strong> 
            <span style={{ 
              fontFamily: 'monospace',
              fontSize: '12px',
              backgroundColor: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: '3px',
              marginLeft: '5px'
            }}>
              {sessionData.session_folder_path}
            </span>
          </p>
        )}
        
        {!sessionData.obs_connected && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#856404'
          }}>
            <strong>⚠️ OBS Connection Issue:</strong><br/>
            Replay capture will use fallback method (F9 keypress).<br/>
            <em>Check OBS Studio is running and WebSocket is enabled.</em>
          </div>
        )}
      </div>
      
      <div className="timer">
        {formatTime(timeRemaining)}
      </div>
      
      <p>Time Remaining</p>
      
      <div style={{ marginTop: '40px' }}>
        <button 
          className="btn btn-large"
          onClick={executeReplayCapture}
          disabled={isCapturing || !sessionData || !sessionData.session_id}
        >
          {isCapturing ? 'Capturing...' : (!sessionData || !sessionData.session_id ? 'Loading...' : 'Take Replay')}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => navigate(`/gallery/${sessionId}`)}
        >
          View Gallery
        </button>
        
        <button 
          className="btn btn-danger"
          onClick={handleEndSession}
        >
          End Session
        </button>
      </div>
      
      <div style={{ marginTop: '30px', fontSize: '16px', color: '#666' }}>
        <p>💡 Press "Take Replay" button or <strong>F9 key</strong> to capture a moment during your session</p>
        <p>📱 Use "View Gallery" to see and download your captures</p>
      </div>
      
      {/* Debug Information Toggle */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#666', 
            fontSize: '12px', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => setShowDebugInfo(!showDebugInfo)}
        >
          {showDebugInfo ? 'Hide' : 'Show'} Session Details
        </button>
        
        {showDebugInfo && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'left'
          }}>
            <p><strong>Session ID:</strong> {sessionData.id}</p>
            <p><strong>Session UUID:</strong> {sessionData.session_id}</p>
            <p><strong>Status:</strong> {sessionData.status}</p>
            <p><strong>Created:</strong> {new Date(sessionData.created_at).toLocaleString()}</p>
            <p><strong>Data Source:</strong> SQLite Database</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionPage