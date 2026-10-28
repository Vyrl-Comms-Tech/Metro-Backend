const { Router } = require('express')
const { getContent, saveContent } = require('../controllers/contentController')

const router = Router()

router.get('/', getContent)
router.put('/', saveContent)

module.exports = router
