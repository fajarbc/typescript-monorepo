import express from "express";
import * as trpc from "@trpc/server"
import * as trpcExpress from "@trpc/server/adapters/express"
import cors from "cors"
import { z } from "zod"
import { Subscription } from "@trpc/server";
import { EventEmitter }from "events"

const ee = new EventEmitter();

interface chatMessage {
  user: string;
  message: string;
}

const messages: chatMessage[] = [];

const appRouter = trpc.router()
.query("hello", {
  resolve() {
    return "Hello World!";
  },
})
.query("getMessages", {
  input: z.number().default(10),
  resolve({input}) {
    return messages.slice(-input)
  }
})
.mutation("addMessage", {
  input: z.object({
    user: z.string(),
    message: z.string(),
  }),
  resolve({input}) {
    messages.push(input)
    console.log("[S] mutation addMessage", input);
    ee.emit("add", input)
    return input
  }
}).subscription("onAdd", {
  resolve() {
    return new Subscription<chatMessage>(emit => {
      const onAdd = (data: chatMessage) => {
        emit.data(data)
      };
      ee.on("add", onAdd);
      console.log("[S] subscription onAdd");
      return () => {
        ee.off("add", onAdd);
      };
    })
  }
})


export type AppRouter = typeof appRouter

const app = express();
const port = 8080;

app.use(cors())
const serverOptions = {
  router: appRouter,
  createContext: () => null,
};
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware(serverOptions)
)

app.get("/", (req, res) => {
  res.send("Hello from api-server");
});

const server = app.listen(port, () => {
  console.log(`api-server listening at http://localhost:${port}`);
});

import { applyWSSHandler } from '@trpc/server/adapters/ws';
import ws from 'ws';
// ws server
const wss = new ws.Server({ server });
applyWSSHandler<AppRouter>({
  wss,
  router: appRouter,
  createContext() {
    return {};
  },
});