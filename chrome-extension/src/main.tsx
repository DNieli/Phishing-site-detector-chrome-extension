import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./popup/index";
import "./global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="w-[360px] min-h-[440px] bg-[#061326] text-slate-50">
      <Popup />
    </div>
  </StrictMode>
);
