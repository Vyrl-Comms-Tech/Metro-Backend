const { Router } = require('express')
const controller = require('../controllers/authController')

const router = Router()

router.post('/login', controller.login)
router.post('/logout', controller.logout)
router.get('/refresh-token', controller.refreshToken)

module.exports = router
