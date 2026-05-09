import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Karaoke server'))
app.get('/health', (c) =>
  c.json({ status: 'ok', uptime: process.uptime() }),
)

const port = Number(process.env.PORT) || 3000

console.log(`🎤 Karaoke server listening on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
