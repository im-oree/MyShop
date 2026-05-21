import { App } from './app.js'
import { config } from './config/index.js'

// Create and start the server
const app = new App()
app.listen(config.port)
