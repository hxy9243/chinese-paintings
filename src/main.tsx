import React from "react";
import ReactDOM from "react-dom/client";
const App = React.lazy(() => import("./Mock3D"));
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense fallback={<div style={{ padding: 40 }}>清明小景…</div>}>
      <App />
    </React.Suspense>
  </React.StrictMode>,
);
