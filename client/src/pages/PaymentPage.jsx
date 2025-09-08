import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const PaymentPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const response = await fetch(`/api/payment-status/${orderId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch payment data')
        }
        const data = await response.json()
        setPaymentData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentData()
  }, [orderId])

  useEffect(() => {
    if (!paymentData) return

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment-status/${orderId}`)
        if (!response.ok) return

        const data = await response.json()
        
        if (data.status === 'success') {
          // Find the session ID from the payment data
          // In a real app, you'd get this from the payment response
          const sessionId = paymentData.sessionId || '1' // Mock session ID
          navigate(`/start-session/${sessionId}`)
        }
      } catch (err) {
        console.error('Error checking payment status:', err)
      }
    }

    // Check payment status every 2 seconds
    const interval = setInterval(checkPaymentStatus, 2000)
    
    return () => clearInterval(interval)
  }, [paymentData, orderId, navigate])

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading Payment...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="card">
        <h2>Payment Not Found</h2>
        <button className="btn" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Complete Your Payment</h2>
      <p>Session Duration: {paymentData.duration} minutes</p>
      <p>Amount: ${paymentData.amount}</p>
      
      <div className="qr-container">
        <h3>Scan QR Code to Pay</h3>
        <img 
          src={paymentData.qrCode} 
          alt="Payment QR Code" 
          className="qr-code"
        />
      </div>
      
      <p>Waiting for payment confirmation...</p>
      
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
      >
        Cancel
      </button>
    </div>
  )
}

export default PaymentPage
