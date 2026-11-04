const { Router } = require('express')
const controller = require('../controllers/authController')
const { loginLimiter } = require('../middleware/rateLimit')

const router = Router()

router.post('/login', loginLimiter, controller.login)
router.post('/logout', controller.logout)
router.get('/refresh-token', controller.refreshToken)

module.exports = router
