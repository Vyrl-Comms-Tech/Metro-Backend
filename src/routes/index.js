const { Router } = require('express')

const { protectWrites } = require('../middleware/auth')

const router = Router()

// public routes
router.use('/auth', require('./authRoutes'))
router.use('/gold', require('./goldRoutes'))

router.use('/products', protectWrites, require('./productRoutes'))
router.use('/categories', protectWrites, require('./categoryRoutes'))
router.use('/faqs', protectWrites, require('./faqRoutes'))
router.use('/reels', protectWrites, require('./reelRoutes'))
router.use('/content', protectWrites, require('./contentRoutes'))
router.use('/uploads', protectWrites, require('./uploadRoutes'))

module.exports = router
