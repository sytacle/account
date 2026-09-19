if (import.meta.env.DEV) {
  import("eruda").then(({ default: eruda }) => eruda.init());
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./config/firebase/index.js";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import SsoBridge from "./pages/SsoBridge";
import SsoLogin from "./pages/SsoLogin";

const isSsoBridge = window.location.pathname === "/sso/bridge";
const isSsoLogin = window.location.pathname === "/sso/login";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {isSsoBridge ? (
        <SsoBridge />
      ) : isSsoLogin ? (
        <SsoLogin />
      ) : (
        <AuthProvider>
          <App />
        </AuthProvider>
      )}
    </BrowserRouter>
  </StrictMode>,
);
