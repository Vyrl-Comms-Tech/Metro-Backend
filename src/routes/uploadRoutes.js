const { Router } = require('express')
const { upload } = require('../middleware/upload')
const { uploadFiles } = require('../controllers/uploadController')

const router = Router()

// multipart field name: "files"
router.post('/', upload.array('files', 10), uploadFiles)

module.exports = router
