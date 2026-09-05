import type { FastifyError, FastifyInstance } from 'fastify'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'Unhandled request error')

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
    reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal server error' : error.message,
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: 'Not found' })
  })
}
