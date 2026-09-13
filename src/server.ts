import { createApp } from "./http/app.js";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const host = "0.0.0.0";

const server = createApp();

server.listen(port, host, () => {
  console.info(
    JSON.stringify({
      event: "server.started",
      host,
      port,
    }),
  );
});
