// POST /  (the files are already saved by the upload middleware)
// responds with their public paths, e.g. ["/uploads/abc.jpg"]
function uploadFiles(req, res) {
  res.status(201).json({ urls: req.files.map((file) => `/uploads/${file.filename}`) })
}

module.exports = { uploadFiles }
