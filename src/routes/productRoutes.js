const { Router } = require('express')
const controller = require('../controllers/productController')

const router = Router()

router.get('/getAll', controller.list)
router.get('/filters', controller.filters)
router.get('/getcaratvalues', controller.getCaratData)
router.post('/create', controller.create)
router.get('/get/:id', controller.getOne)
router.get('/slug/:slug', controller.getBySlug)
router.put('/update/:id', controller.update)
router.delete('/remove/:id', controller.remove)
router.get('/suggestion', controller.suggestions)

module.exports = router
