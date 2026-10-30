// an error with an HTTP status, turned into a JSON response by errorHandler
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
  }
}

module.exports = AppError
