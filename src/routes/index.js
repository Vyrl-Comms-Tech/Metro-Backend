const { Router } = require('express')
const crudRoutes = require('./crudRoutes')
const contentRoutes = require('./contentRoutes')
const uploadRoutes = require('./uploadRoutes')
const productController = require('../controllers/productController')
const categoryController = require('../controllers/categoryController')
const faqController = require('../controllers/faqController')
const reelController = require('../controllers/reelController')

const router = Router()

router.use('/products', crudRoutes(productController))
router.use('/categories', crudRoutes(categoryController))
router.use('/faqs', crudRoutes(faqController))
router.use('/reels', crudRoutes(reelController))
router.use('/content', contentRoutes)
router.use('/uploads', uploadRoutes)

module.exports = router
