const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

const REFRESH_SECRET = `${process.env.SECRET_KEY}:refresh`

const sign = (payload, secret, expiresIn) => jwt.sign(payload, secret, { expiresIn })

const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest()
  const y = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(x, y)
}

const issueTokens = (payload) => ({
  accessToken: sign(payload, process.env.SECRET_KEY, '15m'),
  refreshToken: sign(payload, REFRESH_SECRET, '7d'),
})

function login(email, password) {
  if (!same(email.trim().toLowerCase(), process.env.ADMIN_EMAIL.trim().toLowerCase()) || !same(password, process.env.ADMIN_PASSWORD.trim())) {
    throw new AppError('Invalid credentials', 401)
  }
  return issueTokens({ name: 'admin', role: 'admin' })
}

function refreshAccessToken(refreshToken) {
  try {
    const { name, role } = jwt.verify(refreshToken, REFRESH_SECRET)
    return { accessToken: sign({ name, role }, process.env.SECRET_KEY, '15m') }
  } catch {
    throw new AppError('Invalid or expired refresh token', 401)
  }
}

module.exports = { login, refreshAccessToken }
