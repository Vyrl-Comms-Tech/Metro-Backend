const { Router } = require('express')

// list / get / create / update / delete routes for a CRUD controller
function crudRoutes(controller) {
  const router = Router()

  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id', controller.getOne)
  router.put('/:id', controller.update)
  router.delete('/:id', controller.remove)

  return router
}

module.exports = crudRoutes
