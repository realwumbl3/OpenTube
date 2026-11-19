import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { token } = useParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    loginWithToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('That login link is invalid.'))
  }, [token, loginWithToken, navigate])

  return (
    <div className="app login-page">
      <div className="login-page__panel">
        {error ? (
          <p className="form-error">{error}</p>
        ) : (
          <p className="login-page__status">Signing you in…</p>
        )}
      </div>
    </div>
  )
}
