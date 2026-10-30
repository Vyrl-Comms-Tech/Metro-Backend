const AppError = require('../utils/AppError')
const authService = require('../services/authService')

const isProd = process.env.NODE_ENV === 'production'

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

// POST /login  { email, password }
function login(req, res) {
  const { email, password } = req.body ?? {}
  if (!email || !password) throw new AppError('Email and password are required', 400)

  const { accessToken, refreshToken } = authService.login(email, password)
  res.cookie('refreshToken', refreshToken, cookieOptions)
  res.json({ message: 'Logged in successfully', accessToken })
}

// POST /logout
function logout(req, res) {
  res.clearCookie('refreshToken', { ...cookieOptions, maxAge: undefined })
  res.json({ message: 'Logged out successfully' })
}

// GET /refresh-token  (reads the httpOnly cookie)
function refreshToken(req, res) {
  const token = req.cookies?.refreshToken
  if (!token) throw new AppError('No refresh token found', 401)
  res.json(authService.refreshAccessToken(token))
}

module.exports = { login, logout, refreshToken }
