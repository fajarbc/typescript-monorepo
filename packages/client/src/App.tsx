import React, { useState } from "react";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { trpc } from "./trpc";

import "./index.scss";

const client = new QueryClient();

const AppContent = () => {
  const getMessages = trpc.useQuery(["getMessages"]);

  const [user, setUser] = useState("")
  const [message, setMessage] = useState("")
  const addMessage = trpc.useMutation(["addMessage"]);
  const onAddMessage = () => {
    addMessage.mutate({
      user: user,
      message: message,
    },
    {
      onSuccess: () => {
        client.invalidateQueries(["getMessages"])
      }
    })
  }

  return (
    <div className="mt-10 text-3xl mx-auto max-w-6xl">
      <div>{ (getMessages.data ?? []).map(row => (
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
          className="p-4 border border-gray 500 rounded-md w-full"
        />
        <input 
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          className="p-4 border border-gray 500 rounded-md w-full"
        />
      </div>
      <button 
        onClick={onAddMessage}
        className="bg-blue-500 text-white p-4 rounded-full"
      >Add Message</button>
    </div>
  );
};

const App = () => {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      url: "http://localhost:8080/trpc",
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={client}>
    <QueryClientProvider client={client}>
      <AppContent/>
    </QueryClientProvider>
    </trpc.Provider>
  )
}

ReactDOM.render(<App />, document.getElementById("app"));
