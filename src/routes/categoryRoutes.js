const { Router } = require('express')
const controller = require('../controllers/categoryController')

const router = Router()

router.get('/', controller.list)
router.post('/', controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)

module.exports = router
