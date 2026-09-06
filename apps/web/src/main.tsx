import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Scenario = {
  id: string;
  title: string;
  context: string;
  outcome: string;
  mutation: boolean;
  available: boolean;
};
type Scope = {
  objective: string;
  researchUrls: string[];
  githubTarget: null | {
    operation: string;
    owner: string;
    repository: string;
    pullRequest: number;
    headCommit: string;
    baseBranch: string;
  };
};
type Preview = {
  previewId: string;
  previewDigest: string;
  expiresAt: string;
  scope: Scope;
  maxMutations: number;
};
type Result = {
  cost?: {
    currency: "USD";
    modelAndResearchMicroUsd: number;
    status: "usage_estimate" | "reservation_pending";
  };
  answer?: string;
  state: string;
  assurance: string;
  evidence: { kind: string; origin: string; action: string }[];
};
const errors: Record<string, string> = {
  unauthorized: "Judge access was not accepted. Check your code and connection.",
  invalid_request:
    "Check your objective and exact targets. Use public HTTPS URLs without query strings or fragments.",
  preview_unavailable: "This preview expired, changed, or was used. Prepare a new preview.",
  capacity_unavailable: "Judge capacity is full. Please try again later.",
  unavailable: "This session is unavailable. No successful execution is being claimed.",
};
const labels: Record<string, string> = {
  content_exposed: "Content reached the model",
  model_declined: "Model declined the instruction",
  action_allowed: "Action allowed",
  action_attempted: "Model requested an action",
  action_denied: "Action denied",
  approval_required: "Additional approval required",
  task_completed: "Task completed",
};
function JudgePortal() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [pilotedAvailable, setPilotedAvailable] = useState(false);
  const [catalogState, setCatalogState] = useState("Loading scenarios…");
  const [mode, setMode] = useState("seeded");
  const [selected, setSelected] = useState<string | null>(null);
  const [credential, setCredential] = useState("");
  const [objective, setObjective] = useState("");
  const [urls, setUrls] = useState("");
  const [operation, setOperation] = useState("none");
  const [repository, setRepository] = useState("");
  const [pr, setPr] = useState("");
  const [head, setHead] = useState("");
  const [base, setBase] = useState("main");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/v1/judge/catalog", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as {
          scenarios?: Scenario[];
          pilotedAvailable?: boolean;
        };
        if (!Array.isArray(data.scenarios) || data.scenarios.length !== 3) throw new Error();
        setScenarios(data.scenarios);
        setSelected(data.scenarios[0]?.id ?? null);
        setPilotedAvailable(data.pilotedAvailable === true);
        setCatalogState(
          data.scenarios.some((s) => s.available) || data.pilotedAvailable
            ? "Choose a challenge or bring your own task."
            : "Scenario specifications are ready. Live execution is not configured on this host.",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCatalogState(
            "Judge service unavailable. Connect to a configured host to load scenarios.",
          );
      });
    return () => {
      controller.abort();
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    setPreview(null);
  }, [mode, selected, objective, urls, operation, repository, pr, head, base]);
  async function request(action: string, body: unknown) {
    setBusy(true);
    setMessage("");
    setResult(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch(`/v1/judge/${action}`, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const code =
          typeof data === "object" && data !== null && "code" in data
            ? String(data.code)
            : "unavailable";
        setMessage(errors[code] ?? errors.unavailable!);
        return;
      }
      if (action === "draft") setPreview(data as Preview);
      else {
        setPreview(null);
        setResult(data as Result);
      }
    } catch {
      setMessage(
        controller.signal.aborted
          ? "Cancellation requested. Uncertain external actions require operator reconciliation before reuse."
          : errors.unavailable!,
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  function draft() {
    if (mode === "seeded") {
      void request("draft", { schemaVersion: 1, mode, scenarioId: selected });
      return;
    }
    const [owner, repo] = repository.trim().split("/");
    void request("draft", {
      schemaVersion: 1,
      mode: "piloted",
      scope: {
        objective: objective.trim(),
        researchUrls: urls.split(/\s+/u).filter(Boolean),
        durationSeconds: 300,
        githubTarget:
          operation === "none"
            ? null
            : {
                operation,
                owner,
                repository: repo,
                pullRequest: Number(pr),
                headCommit: head.trim(),
                baseBranch: base.trim(),
              },
      },
    });
  }
  const scenario = scenarios.find((s) => s.id === selected);
  const available = mode === "seeded" ? scenario?.available : pilotedAvailable;
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          G<span>GUARDIAN</span>
        </a>
        <span className="host-state">Testing portal · Local build</span>
      </header>
      <section className="intro">
        <p className="eyebrow">JUDGE WORKSPACE</p>
        <h1>Put the boundaries to work.</h1>
        <p>
          Give the agent a useful task. See what it attempts, what Guardian permits, and what gets
          done.
        </p>
      </section>
      <div className="workspace">
        <section aria-label="Choose a task">
          <div className="mode-switch" aria-label="Task mode">
            <button
              aria-pressed={mode === "seeded"}
              disabled={busy}
              onClick={() => setMode("seeded")}
            >
              Seeded challenges
            </button>
            <button
              aria-pressed={mode === "piloted"}
              disabled={busy}
              onClick={() => setMode("piloted")}
            >
              Your own task
            </button>
          </div>
          <p className="service-note">{catalogState}</p>
          {mode === "seeded" ? (
            <div className="scenarios">
              {scenarios.map((s, i) => (
                <button
                  key={s.id}
                  className={`scenario ${selected === s.id ? "selected" : ""}`}
                  aria-pressed={selected === s.id}
                  disabled={busy}
                  onClick={() => setSelected(s.id)}
                >
                  <span className="scenario-number">0{i + 1}</span>
                  <span className="scenario-body">
                    <span className="scenario-meta">
                      {s.mutation ? "One exact write" : "Read-only mission"}
                    </span>
                    <strong>{s.title}</strong>
                    <span>{s.context}</span>
                  </span>
                  <span className="selection-mark" aria-hidden="true">
                    {selected === s.id ? "●" : "○"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <fieldset disabled={busy} className="custom-form">
              <legend>Define the mission</legend>
              <label>
                What should the agent accomplish?
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  maxLength={1000}
                  placeholder="Compare the release notes and review the relevant pull request."
                />
              </label>
              <label>
                Public source URLs <span>Up to four, one per line</span>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder="https://example.com/release-notes"
                />
              </label>
              <label>
                GitHub operation
                <select value={operation} onChange={(e) => setOperation(e.target.value)}>
                  <option value="none">Public research only</option>
                  <option value="github.pull_request.read">Read a pull request</option>
                  <option value="github.pull_request.merge">
                    Read and squash-merge an exact pull request
                  </option>
                </select>
              </label>
              {operation !== "none" && (
                <div className="target-fields">
                  <label>
                    Repository
                    <input
                      value={repository}
                      onChange={(e) => setRepository(e.target.value)}
                      placeholder="owner/repository"
                    />
                  </label>
                  <label>
                    PR number
                    <input inputMode="numeric" value={pr} onChange={(e) => setPr(e.target.value)} />
                  </label>
                  <label className="wide">
                    Expected head commit
                    <input
                      value={head}
                      onChange={(e) => setHead(e.target.value)}
                      maxLength={40}
                      placeholder="40-character commit SHA"
                    />
                  </label>
                  <label>
                    Base branch
                    <input value={base} onChange={(e) => setBase(e.target.value)} />
                  </label>
                </div>
              )}
              <p className="hint">
                Supported public sources and authorized GitHub connections only. A custom task may
                encounter no malicious content.
              </p>
            </fieldset>
          )}
        </section>
        <aside className="session-panel" aria-label="Session review">
          <p className="eyebrow">SESSION SCOPE</p>
          <h2>{preview ? "Review before launch" : "A clear starting point"}</h2>
          <p>
            {preview
              ? preview.scope.objective
              : mode === "seeded"
                ? scenario?.outcome
                : "Your objective and exact targets will appear here before you grant authority."}
          </p>
          <dl className="limits">
            <div>
              <dt>Duration</dt>
              <dd>5 minutes</dd>
            </div>
            <div>
              <dt>Tool calls</dt>
              <dd>At most 20</dd>
            </div>
            <div>
              <dt>Research requests</dt>
              <dd>At most 2</dd>
            </div>
            <div>
              <dt>Mutations</dt>
              <dd>
                {preview
                  ? preview.maxMutations
                  : mode === "seeded"
                    ? scenario?.mutation
                      ? "One exact merge"
                      : "None"
                    : operation === "github.pull_request.merge"
                      ? "One exact merge"
                      : "None"}
              </dd>
            </div>
          </dl>
          {preview && (
            <div className="exact-scope">
              {preview.scope.researchUrls.map((url) => (
                <p key={url}>{url}</p>
              ))}
              {preview.scope.githubTarget && (
                <>
                  <p>{preview.scope.githubTarget.operation}</p>
                  <p>
                    {preview.scope.githubTarget.owner}/{preview.scope.githubTarget.repository} #
                    {preview.scope.githubTarget.pullRequest}
                  </p>
                  <code>{preview.scope.githubTarget.headCommit}</code>
                  <p>Base: {preview.scope.githubTarget.baseBranch}</p>
                </>
              )}
              <p>
                Preview expires {new Date(preview.expiresAt).toLocaleTimeString()}. Development
                confirmation; no passkey verification.
              </p>
            </div>
          )}
          <label>
            Judge access code
            <input
              type="password"
              autoComplete="off"
              value={credential}
              disabled={busy}
              onChange={(e) => setCredential(e.target.value)}
              aria-describedby="access-help"
            />
          </label>
          <p id="access-help" className="hint">
            Kept in page memory. Never enter a provider key.
          </p>
          {preview ? (
            <button
              className="primary"
              disabled={busy || !credential}
              onClick={() =>
                void request("confirm", {
                  schemaVersion: 1,
                  previewId: preview.previewId,
                  previewDigest: preview.previewDigest,
                })
              }
            >
              {busy ? "Session running…" : "Confirm scope and launch"}
            </button>
          ) : (
            <button
              className="primary"
              disabled={busy || !available || !credential}
              onClick={draft}
            >
              {busy ? "Preparing preview…" : "Prepare session preview"}
            </button>
          )}
          {busy && (
            <button className="cancel" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          )}
          {!available && (
            <p className="hint">
              Execution unavailable until this host’s runtime is configured and verified.
            </p>
          )}
          <div role="status" aria-live="polite">
            {message && <p className="notice">{message}</p>}
          </div>
        </aside>
      </div>
      <section className="evidence" aria-label="Session evidence">
        <div>
          <p className="eyebrow">OBSERVED DURING THIS RUN</p>
          <h2>{result ? `Session ${result.state}` : "Evidence appears here"}</h2>
        </div>
        {result?.answer && <p className="session-answer">{result.answer}</p>}
        {result && (
          <p className="session-cost">
            {result.cost
              ? `${result.cost.status === "usage_estimate" ? "Model and research estimate" : "Reserved amount awaiting reconciliation"}: $${(result.cost.modelAndResearchMicroUsd / 1_000_000).toFixed(4)} USD. Provider billing is pending; infrastructure is reported separately.`
              : "Session cost: pending usage reporting."}
          </p>
        )}
        <span className="assurance">Assurance: {result?.assurance ?? "unknown"}</span>
        {result ? (
          result.evidence.length ? (
            <ol>
              {result.evidence.map((event, i) => (
                <li key={i}>
                  <strong>{labels[event.kind] ?? "Observed event"}</strong>
                  <span>
                    {event.origin} · {event.action}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              No action evidence was returned. This does not establish that an attack was blocked.
            </p>
          )
        ) : (
          <p>
            Content exposure, model decisions and action checks are separate observations. A seeded
            instruction does not guarantee the model will follow it.
          </p>
        )}
      </section>
    </main>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Guardian web root is missing");
createRoot(root).render(
  <StrictMode>
    <JudgePortal />
  </StrictMode>,
);
