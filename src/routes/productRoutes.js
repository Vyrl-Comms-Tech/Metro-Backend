const { Router } = require('express')
const controller = require('../controllers/productController')

const router = Router()

router.get('/getAll', controller.list)
router.get('/filters', controller.filters)
router.post('/create', controller.create)
router.get('/get/:id', controller.getOne)
router.put('/update/:id', controller.update)
router.delete('/remove/:id', controller.remove)

module.exports = router
