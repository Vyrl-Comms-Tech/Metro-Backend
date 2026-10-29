const { Router } = require('express')

const router = Router()

router.use('/products', require('./productRoutes'))
router.use('/categories', require('./categoryRoutes'))
router.use('/faqs', require('./faqRoutes'))
router.use('/reels', require('./reelRoutes'))
router.use('/content', require('./contentRoutes'))
router.use('/gold', require('./goldRoutes'))
router.use('/uploads', require('./uploadRoutes'))

module.exports = router
