import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { ok } from './lib/response.js'
import { prisma } from './lib/prisma.js'

// Route modules are registered lazily below to keep this file focused.
import { authRouter } from './modules/auth/routes.js'
import { usersRouter } from './modules/users/routes.js'
import { editorsRouter } from './modules/editors/routes.js'
import { departmentsRouter } from './modules/departments/routes.js'
import { warningsRouter } from './modules/warnings/routes.js'
import { leaveRequestsRouter } from './modules/leaveRequests/routes.js'
import { attendanceRouter } from './modules/attendance/routes.js'
import { projectsRouter } from './modules/projects/routes.js'
import { applicationsRouter } from './modules/applications/routes.js'
import { kpiRouter } from './modules/kpi/routes.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
// 8mb: job applications carry the CV inline as a base64 data URL (max 5MB file).
app.use(express.json({ limit: '8mb' }))
if (env.NODE_ENV !== 'test') app.use(morgan('dev'))

// Health check — used by Docker healthcheck and monitoring.
app.get('/api/v1/health', (_req, res) => {
  res.json(ok({ status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() }))
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/editors', editorsRouter)
app.use('/api/v1/departments', departmentsRouter)
app.use('/api/v1/warnings', warningsRouter)
app.use('/api/v1/leave-requests', leaveRequestsRouter)
app.use('/api/v1/attendance', attendanceRouter)
app.use('/api/v1/projects', projectsRouter)
app.use('/api/v1/applications', applicationsRouter)
app.use('/api/v1/kpi', kpiRouter)

// Fallback for unknown routes
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Not found' })
})

app.use(errorHandler)

const port = env.PORT
const server = app.listen(port, () => {
  console.log(`🚀 Manava API listening on http://localhost:${port} [${env.NODE_ENV}]`)
})

// Graceful shutdown so Prisma releases connections cleanly.
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down`)
  server.close(() => console.log('HTTP server closed'))
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
