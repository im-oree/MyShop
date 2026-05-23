const { spawn } = require('node:child_process')

const port = process.env.PORT || '4173'
const command = 'npx'
const args = ['vite', 'preview', '--host', '0.0.0.0', '--port', port]

const child = spawn(command, args, { stdio: 'inherit', shell: true })

child.on('exit', (code) => {
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error('Failed to start preview server:', error)
  process.exit(1)
})
