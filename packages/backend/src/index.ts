import app from "./app.js";
import { config } from "./lib/config.js";

console.log(`🚀 Presto Backend running on http://localhost:${config.app.port}`);

export default {
  port: config.app.port,
  fetch: app.fetch,
};
