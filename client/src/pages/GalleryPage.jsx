import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'

const GalleryPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [sessionInfo, setSessionInfo] = useState(null)
  const [directory, setDirectory] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)

  useEffect(() => {
    console.log('🔍 GalleryPage useEffect triggered with session ID:', sessionId)
    
    // If no session ID is provided, redirect to homepage
    if (!sessionId) {
      console.log('❌ No session ID provided, redirecting to homepage')
      navigate('/')
      return
    }
    
    console.log('✅ Session ID provided, proceeding with fetchVideos')
    fetchVideos()
  }, [sessionId, navigate])

  const fetchVideos = async () => {
    try {
      console.log('🔍 GalleryPage fetchVideos called with session ID:', sessionId)
      
      // First, validate that the session exists
      console.log('📡 Validating session with URL:', `/api/session/${sessionId}`)
      const sessionResponse = await fetch(`/api/session/${sessionId}`)
      console.log('📊 Session validation response status:', sessionResponse.status)
      
      if (!sessionResponse.ok) {
        if (sessionResponse.status === 404) {
          console.log('❌ Session not found, redirecting to homepage')
          navigate('/')
          return
        } else {
          // For other session errors, log but don't redirect - show empty state instead
          console.error('❌ Session validation error:', sessionResponse.status)
          setVideos([])
          setSessionInfo(null)
          setDirectory('')
          return
        }
      }

      const session = await sessionResponse.json()
      console.log('✅ Session validation successful:', session)
      
      // Check if session is active
      console.log('🔍 Checking session status:', session.status)
      if (session.status !== 'active') {
        console.log(`❌ Session is not active (status: ${session.status}), redirecting to homepage`)
        alert(`Session has ${session.status}. Please create a new session.`)
        navigate('/')
        return
      }
      
      console.log('✅ Session is active, proceeding with video fetch')

      // Now fetch videos for the valid session
      const url = `/api/gallery-videos/${sessionId}`
      console.log('📡 Fetching videos with URL:', url)
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Videos API error:', errorData)
        
        // For video fetch errors, show empty state instead of redirecting
        console.log('📁 Showing empty state due to video fetch error')
        setVideos([])
        setSessionInfo(session) // Keep session info if available
        setDirectory('')
        return
      }
      const data = await response.json()
      console.log('📊 Videos API response:', data)
      
      // Handle new response format
      setVideos(data.videos || data) // Backward compatibility
      setSessionInfo(data.session_info || session) // Use session from validation if not in response
      setDirectory(data.directory || '')
      
      console.log('✅ GalleryPage state updated:')
      console.log('  - Videos count:', (data.videos || data).length)
      console.log('  - Session info:', data.session_info || session)
      console.log('  - Directory:', data.directory)
    } catch (err) {
      console.error('❌ GalleryPage fetchVideos error:', err)
      // Don't set error state for network issues - show empty state instead
      setVideos([])
      setSessionInfo(null)
      setDirectory('')
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (filename) => {
    // Get the current host and port
    const baseUrl = `${window.location.protocol}//${window.location.host}`
    // Include session ID in the URL if available
    const downloadUrl = sessionId ? `${baseUrl}/api/video/${filename}?sessionId=${sessionId}` : `${baseUrl}/api/video/${filename}`
    
    try {
      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(downloadUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      return qrDataURL
    } catch (error) {
      console.error('Error generating QR code:', error)
      return ''
    }
  }

  const handleSendToPhone = async (video) => {
    setSelectedVideo(video)
    const qrDataURL = await generateQRCode(video.filename)
    setQrCodeUrl(qrDataURL)
  }

  const closeQRModal = () => {
    setSelectedVideo(null)
    setQrCodeUrl('')
  }

  const openVideoOverlay = (video, index) => {
    setSelectedVideo(video)
    setCurrentVideoIndex(index)
  }

  const closeVideoOverlay = () => {
    setSelectedVideo(null)
  }

  const nextVideo = () => {
    if (videos.length === 0) return
    const nextIndex = (currentVideoIndex + 1) % videos.length
    setCurrentVideoIndex(nextIndex)
    setSelectedVideo(videos[nextIndex])
  }

  const prevVideo = () => {
    if (videos.length === 0) return
    const prevIndex = currentVideoIndex === 0 ? videos.length - 1 : currentVideoIndex - 1
    setCurrentVideoIndex(prevIndex)
    setSelectedVideo(videos[prevIndex])
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!selectedVideo) return

      switch (event.key) {
        case 'Escape':
          if (qrCodeUrl) {
            closeQRModal()
          } else {
            closeVideoOverlay()
          }
          break
        case 'ArrowLeft':
          if (!qrCodeUrl) {
            prevVideo()
          }
          break
        case 'ArrowRight':
          if (!qrCodeUrl) {
            nextVideo()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [selectedVideo, qrCodeUrl, videos.length, currentVideoIndex])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading Gallery...</h2>
      </div>
    )
  }

  // Error state is now handled by showing empty state instead of redirecting
  // Errors are logged to console for debugging

  return (
    <div className="card">
      <h2>Video Gallery</h2>
      {sessionInfo && (
        <div>
          <p><strong>Session:</strong> {sessionInfo.session_name}</p>
        </div>
      )}
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate(`/session/${sessionId}`)}
        >
          Back to Session
        </button>
        <button 
          className="btn"
          onClick={fetchVideos}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No videos found</h3>
          {sessionInfo ? (
            <div>
              <p>No video files found in session folder yet</p>
            </div>
          ) : (
            <div>
              <p>Unable to load session information</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                Check the console for error details.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="gallery-grid">
          {videos.map((video, index) => (
            <div key={index} className="video-thumbnail" style={{ cursor: 'pointer' }}>
              <div 
                onClick={() => openVideoOverlay(video, index)}
                style={{ position: 'relative' }}
              >
                <video
                  preload="metadata"
                  style={{ 
                    width: '100%', 
                    maxWidth: '200px', 
                    height: 'auto',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    console.error('Video load error for:', video.filename, e);
                  }}
                  onLoadStart={() => {
                    console.log('Loading video:', video.filename);
                  }}
                >
                  <source src={`/api/video/${video.filename}${sessionId ? `?sessionId=${sessionId}` : ''}`} type="video/mp4" />
                  <source src={`/api/video/${video.filename}${sessionId ? `?sessionId=${sessionId}` : ''}`} type="video/webm" />
                  <source src={`/api/video/${video.filename}${sessionId ? `?sessionId=${sessionId}` : ''}`} type="video/ogg" />
                </video>
                
                {/* Play button overlay */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  pointerEvents: 'none'
                }}>
                  ▶️
                </div>
              </div>
              
              <h4 style={{ marginTop: '10px', fontSize: '14px' }}>{video.name}</h4>
              <p style={{ fontSize: '12px', color: '#666' }}>Size: {formatFileSize(video.size)}</p>
              <p style={{ fontSize: '12px', color: '#666' }}>Created: {formatDate(video.created)}</p>
              
              <div style={{ marginTop: '10px' }}>
                <button 
                  className="btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openVideoOverlay(video, index);
                  }}
                  style={{ fontSize: '12px', padding: '8px 12px', marginRight: '5px' }}
                >
                  Play
                </button>
                <button 
                  className="btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendToPhone(video);
                  }}
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                >
                  QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Video Overlay Modal */}
      {selectedVideo && !qrCodeUrl && (
        <div className="video-overlay-backdrop">
          <div className="video-overlay-container" style={{
            width: '80vw',
            height: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* Close button */}
            <button
              className="video-overlay-close"
              onClick={closeVideoOverlay}
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 1001,
                backdropFilter: 'blur(10px)'
              }}
            >
              ✕
            </button>

            {/* Video player */}
            <video
              key={selectedVideo.filename}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
              onError={(e) => {
                console.error('Video overlay load error for:', selectedVideo.filename, e);
                alert(`Error loading video: ${selectedVideo.filename}. The file may not exist or be corrupted.`);
              }}
              onLoadStart={() => {
                console.log('Loading video in overlay:', selectedVideo.filename);
              }}
            >
              <source src={`/api/video/${selectedVideo.filename}${sessionId ? `?sessionId=${sessionId}` : ''}`} type="video/mp4" />
              <source src={`/api/video/${selectedVideo.filename}${sessionId ? `?sessionId=${sessionId}` : ''}`} type="video/webm" />
              <source src={`/api/video/${selectedVideo.filename}${sessionId ? `?sessionId=${sessionId}` : ''}`} type="video/ogg" />
              Your browser does not support the video tag.
            </video>

            {/* Video info */}
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: '15px 25px',
              borderRadius: '25px',
              backdropFilter: 'blur(10px)',
              maxWidth: '80vw'
            }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600' }}>{selectedVideo.name}</h3>
              <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
                {currentVideoIndex + 1} of {videos.length} • {formatFileSize(selectedVideo.size)}
              </p>
            </div>

            {/* Navigation controls */}
            {videos.length > 1 && (
              <>
                <button
                  className="video-overlay-nav"
                  onClick={prevVideo}
                  style={{
                    position: 'fixed',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                    e.target.style.transform = 'translateY(-50%) scale(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.target.style.transform = 'translateY(-50%) scale(1)'
                  }}
                >
                  ◀️
                </button>
                <button
                  className="video-overlay-nav"
                  onClick={nextVideo}
                  style={{
                    position: 'fixed',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                    e.target.style.transform = 'translateY(-50%) scale(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.target.style.transform = 'translateY(-50%) scale(1)'
                  }}
                >
                  ▶️
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedVideo && qrCodeUrl && (
        <div className="qr-modal-backdrop">
          <div className="qr-modal-container" style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            margin: 'auto'
          }}>
            <h3>Scan to Download</h3>
            <p>{selectedVideo.name}</p>
            
            <img 
              src={qrCodeUrl} 
              alt="QR Code for download" 
              style={{ margin: '20px 0', maxWidth: '256px', width: '100%' }}
            />
            
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Scan this QR code with your phone to download the video
            </p>
            
            <button className="btn" onClick={closeQRModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GalleryPage
