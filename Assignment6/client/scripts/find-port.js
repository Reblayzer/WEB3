import { createServer } from 'net'
import { spawn } from 'child_process'

const start = 3000
const end = 3050

const isPortFree = async port => {
  const tryListen = host =>
    new Promise(resolve => {
      const srv = createServer()
      srv.once('error', () => resolve(false))
      srv.once('listening', () => srv.close(() => resolve(true)))
      srv.listen(port, host)
    })
  // Check both IPv6 and IPv4 bindings
  return (await tryListen('::')) && (await tryListen('0.0.0.0'))
}

const findPort = async () => {
  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined
  if (envPort && !Number.isNaN(envPort)) {
    if (await isPortFree(envPort)) return envPort
    console.warn(`PORT ${envPort} is busy, scanning next ports...`)
  }
  for (let p = envPort ?? start; p <= end; p++) {
    if (await isPortFree(p)) return p
  }
  throw new Error(`No free port between ${envPort ?? start}-${end}`)
}

const startNext = port =>
  new Promise(resolve => {
    const ps = spawn('npx', ['next', 'start', '-p', String(port)], { stdio: 'inherit', shell: true })
    ps.on('exit', code => resolve(code ?? 0))
  })

const run = async () => {
  for (let p = process.env.PORT ? Number(process.env.PORT) : start; p <= end; p++) {
    const free = await isPortFree(p)
    if (!free) continue
    console.log(`Starting Next.js on port ${p}...`)
    const code = await startNext(p)
    if (code === 0) return
    console.warn(`Port ${p} failed (possibly taken), trying next...`)
  }
  throw new Error(`Unable to start Next.js between ports ${start}-${end}`)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
