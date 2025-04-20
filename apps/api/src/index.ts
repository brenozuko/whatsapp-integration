import * as http from "http";
import whatsappRoutes from "./routes/whatsapp.routes";
import { createServer } from "./server/server";
import { initializeSocket } from "./server/socket";

const port = process.env.PORT || 3000;
const app = createServer();
const server = http.createServer(app);

initializeSocket(server);

// Mount routes
app.use("/", whatsappRoutes);

server.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
