const Product = require('../models/Product')
const createCrudController = require('./crudController')

module.exports = createCrudController(Product, {
  searchFields: ['name'],
  filterFields: ['collectionSlug', 'category', 'type', 'metal', 'gemstone', 'shape'],
})
