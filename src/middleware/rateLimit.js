const { rateLimit } = require('express-rate-limit')

// public contact form: a handful of messages per hour from one IP is plenty for a real visitor
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7', // sends RateLimit / Retry-After headers
  legacyHeaders: false,
  message: { message: 'Too many messages sent. Please try again later.' },
})

// admin login: stops password guessing. Only failed attempts count, so a real admin is never locked out by logging in
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
})

// every route: a high ceiling per IP that blocks floods and scrapers but not a visitor browsing the catalogue
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
})

module.exports = { enquiryLimiter, loginLimiter, apiLimiter }
