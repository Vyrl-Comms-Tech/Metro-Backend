const { Router } = require('express')
const controller = require('../controllers/categoryController')

const router = Router()

router.get('/getAll', controller.listCategories)
router.post('/createCategory', controller.createCategory)
router.get('/get/:id', controller.getOneCategory)
router.put('/update/:id', controller.updateCategory)
router.patch('/:id/status', controller.setStatusCategory)
router.delete('/delete/:id', controller.removeCategory)

module.exports = router
