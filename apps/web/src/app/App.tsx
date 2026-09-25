import React from "react";
import "../index.css";
import "../lib/i18n";
import { QueryProvider } from "./providers/QueryProvider";
import { AppRoutes } from "./routes";

export const App: React.FC = () => {
  return (
    <QueryProvider>
      <AppRoutes />
    </QueryProvider>
  );
};

export default App;
