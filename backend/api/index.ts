import serverless from 'serverless-http'
import { App } from '../src/app.js'

const app = new App().getApp()

export default serverless(app)
