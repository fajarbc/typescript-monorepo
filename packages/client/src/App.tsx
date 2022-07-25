import React, { useState } from "react";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { trpc } from "./trpc";
import { wsLink, createWSClient } from "@trpc/client/links/wsLink"
import { createTRPCClient } from "@trpc/client"
import { httpLink } from '@trpc/client/links/httpLink';
import { splitLink } from '@trpc/client/links/splitLink';

const [API_URL, WS_URL] = [
  "http://localhost:8080/trpc",
  "ws://localhost:8080",
]

import "./index.scss";
import { AppRouter } from "api-server";

const AppContent = () => {
  // get innitail messages
  const messages = trpc.useQuery(["getMessages"]);
  const [subMessages, setSubMessages] = useState<typeof messages["data"]>(
    () => {
      return messages.data;
    }
  );
  // fetch new messages from subscription
  trpc.useSubscription(["onAdd"], {
    onNext(newMessage) {
      console.log("[C] useSubscription onAdd", newMessage);
      setSubMessages(currentMessages => [...( currentMessages || []), newMessage])
    }
  })

  // add message
  const [user, setUser] = useState("");
  const [message, setMessage] = useState("");
  const addMessage = trpc.useMutation(["addMessage"]);
  const onAddMessage = async () => {
    if(message.trim().length) {
      await addMessage.mutate({
        user: user,
        message: message,
      });
      setMessage("")
    }
  }

  return (
    <div className="mt-10 text-3xl mx-auto max-w-6xl">
      <div>{ (subMessages ?? []).map(row => (
        <div key={row.message} className="m-2">
          <span className="text-blue-500 font-bold">{row.user}</span>: {row.message}
        </div>
      )) }</div>

      <div className="mt-10">
        <input 
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="User"
          className="p-4 border border-gray 500 rounded-md w-full my-2"
        />
        <input 
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          className="p-4 border border-gray 500 rounded-md w-full my-2"
        />
      </div>
      <button 
        onClick={onAddMessage}
        className="bg-blue-500 text-white p-4 rounded-full my-2"
      >Add Message</button>
    </div>
  );
};

const App = () => {

  // http calls
  const wsClient = createWSClient({
    url: WS_URL,
  });
  const trpcClientWs = createTRPCClient<AppRouter>({
    links: [
      // call subscriptions through websockets and the rest over http
      splitLink({
        condition(op) {
          return op.type === 'subscription';
        },
        true: wsLink({
          client: wsClient,
        }),
        false: httpLink({
          url: API_URL,
        }),
      }),
    ],
  });

  const [trpcClient] = useState(() =>
    trpc.createClient({
      url: API_URL
    })
  );

  const queryClient = new QueryClient();
  return (
    <trpc.Provider client={trpcClientWs} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppContent/>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

ReactDOM.render(<App />, document.getElementById("app"));
