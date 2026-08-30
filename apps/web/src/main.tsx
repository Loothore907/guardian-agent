import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

function FoundationStatus() {
  return (
    <main className="shell">
      <p className="eyebrow">GUARDIAN SESSION</p>
      <h1>Bounded autonomy, with evidence.</h1>
      <p className="summary">
        The control plane is scaffolded. Enforcement remains explicitly unclaimed until the
        reference runtime, policy, authorization, and attack evidence pass their checkpoints.
      </p>
      <dl className="status-grid">
        <div>
          <dt>Build phase</dt>
          <dd>C2 · Foundation</dd>
        </div>
        <div>
          <dt>Assurance</dt>
          <dd>Unknown</dd>
        </div>
        <div>
          <dt>External authority</dt>
          <dd>None</dd>
        </div>
      </dl>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Guardian web root is missing");
}

createRoot(root).render(
  <StrictMode>
    <FoundationStatus />
  </StrictMode>,
);
