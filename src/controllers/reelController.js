const Reel = require('../models/Reel')
const createCrudController = require('./crudController')

module.exports = createCrudController(Reel, {
  sort: { order: 1, createdAt: 1 },
})
