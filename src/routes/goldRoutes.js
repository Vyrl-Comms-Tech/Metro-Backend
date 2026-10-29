const { Router } = require('express')
const { get } = require('../controllers/goldController')

const router = Router()

router.get('/', get)

module.exports = router
