const jwt = require('jsonwebtoken')

// requires "Authorization: Bearer <access token>"
function protect(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }
  try {
    const { name, role } = jwt.verify(header.split(' ')[1], process.env.SECRET_KEY)
    if (role !== 'admin') return res.status(403).json({ message: 'Admins only' })
    req.user = { name, role }
    next()
  } catch {
    res.status(401).json({ message: 'Token expired or invalid' })
  }
}

function protectWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  protect(req, res, next)
}

module.exports = { protect, protectWrites }
