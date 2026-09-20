import React from "react";
import ReactDOM from "react-dom/client";
const App = React.lazy(() =>
  new URLSearchParams(window.location.search).get("view") === "3d"
    ? import("./Mock3D")
    : import("./App"),
);
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense fallback={<div style={{ padding: 40 }}>清明小景…</div>}>
      <App />
    </React.Suspense>
  </React.StrictMode>,
);
