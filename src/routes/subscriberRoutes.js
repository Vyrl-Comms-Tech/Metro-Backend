const { Router } = require('express')
const controller = require('../controllers/subscriberController')
const { protect } = require('../middleware/auth')
const { enquiryLimiter } = require('../middleware/rateLimit')

const router = Router()

// visitors can only subscribe; viewing and removing subscribers is admin only
router.post('/', enquiryLimiter, controller.create)
router.get('/', protect, controller.list)
router.delete('/:id', protect, controller.remove)

module.exports = router
