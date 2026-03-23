import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./popup/index";
import "./global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="bg-sky-200 w-[300px] h-[200px]">
      <Popup />
    </div>
  </StrictMode>
);
