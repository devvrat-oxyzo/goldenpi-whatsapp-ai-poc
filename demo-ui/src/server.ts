import { createBackendClientFromEnvironment } from "./backend-client.js";
import { createDemoApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const host = "0.0.0.0";
const backendClient = createBackendClientFromEnvironment();
const server = createDemoApp(backendClient);

server.listen(port, host, () => {
  console.info(
    JSON.stringify({
      event: "ui.server.started",
      host,
      port,
      backendMode: process.env.BACKEND_MODE ?? "mock",
    }),
  );
});
