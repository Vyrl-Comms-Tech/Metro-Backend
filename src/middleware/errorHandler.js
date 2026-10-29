const notFound = (req, res) => res.status(404).json({ message: 'Route not found' })

// turns Mongoose and upload errors into readable responses
const errorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, fields: Object.keys(err.errors) })
  }
  if (err.name === 'MulterError' || err.message === 'Only image or video files are allowed') {
    return res.status(400).json({ message: err.message })
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid ${err.path}` })
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Already exists', fields: Object.keys(err.keyValue) })
  }

  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
}

module.exports = { notFound, errorHandler }
