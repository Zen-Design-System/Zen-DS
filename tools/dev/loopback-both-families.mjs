import net from "node:net";

/*
 * Dev server on both loopback families. Vite binds "localhost", which Node (≥ 17) resolves to ONE address: ::1 on this
 * Mac (Node 24), 127.0.0.1 elsewhere. The other one then refuses connections, so http://127.0.0.1:5173 (bookmarks, the
 * Claude browser pane, `--url=http://127.0.0.1:5173` in the QA tools) failed with "connection refused".
 *
 * This plugin listens on the other loopback address with the same port and pipes each TCP connection to the address
 * Vite bound. Only loopback: a server bound to a LAN or wildcard address is left alone. Plain TCP piping keeps the Host
 * header (the Zen Studio API's loopback and token guards see what they saw before) and carries the HMR WebSocket.
 */
export function loopbackBothFamilies() {
  return {
    name: "zen:loopback-both-families",
    apply: "serve",
    configureServer(server) {
      const http = server.httpServer;
      if (!http) return;
      http.once("listening", () => {
        const bound = http.address();
        if (!bound || typeof bound === "string") return;
        const other = bound.address === "::1" ? "127.0.0.1" : bound.address === "127.0.0.1" ? "::1" : null;
        if (!other) return;
        const forward = net.createServer((client) => {
          const upstream = net.connect({ host: bound.address, port: bound.port });
          client.pipe(upstream).pipe(client);
          client.on("error", () => upstream.destroy());
          upstream.on("error", () => client.destroy());
        });
        // The other address is taken or the family is unavailable: keep the one Vite bound.
        forward.on("error", (error) => server.config.logger.warn(`[zen] ${other}:${bound.port} not forwarded (${error.code ?? error.message})`));
        forward.listen(bound.port, other);
        http.once("close", () => forward.close());
      });
    },
  };
}
