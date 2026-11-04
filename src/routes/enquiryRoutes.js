const { Router } = require('express')
const controller = require('../controllers/enquiryController')
const { protect } = require('../middleware/auth')
const { enquiryLimiter } = require('../middleware/rateLimit')

const router = Router()

// visitors can only send an enquiry; reading and managing them is admin only
router.post('/', enquiryLimiter, controller.create)
router.get('/', protect, controller.list)
router.get('/:id', protect, controller.getOne)
router.put('/:id', protect, controller.update)
router.delete('/:id', protect, controller.remove)

module.exports = router
