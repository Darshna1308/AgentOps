import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = import.meta.env.VITE_API_URL;

const STAGES = [
  { key: "prompt", label: "Prompt", sub: "Received" },
  { key: "agent", label: "Agent", sub: "Assembly" },
  { key: "tool", label: "Tool", sub: "Execution" },
  { key: "inspect", label: "Inspection", sub: "Scan" },
  { key: "eval", label: "Evaluation", sub: "Scoring" },
  { key: "result", label: "Result", sub: "Build" }
];

const OK = ["success", "completed", "passed"];
const BAD = ["failed", "error", "rejected"];

const statusOf = (run) =>
  String(run?.status || run?.result?.status || "unknown").toLowerCase();

const get = (run, key, fallback = "—") =>
  run?.[key] || run?.result?.[key] || fallback;

const formatDate = (date) => {
  if (!date) return "Unknown";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return "Unknown";
  }
};

const formatLatency = (v) =>
  v === undefined || v === null ? "—" : `${Math.round(Number(v))} ms`;
const formatTokens = (v) =>
  v === undefined || v === null ? "—" : Number(v).toLocaleString();
const formatCost = (v) =>
  v === undefined || v === null ? "—" : `$${Number(v).toFixed(6)}`;

function Pipeline({ phase, outcome, running }) {
  const xs = STAGES.map((_, i) => 80 + i * 160);
  const stateOf = (i) =>
    phase < 0 ? "idle" : i < phase ? "done" : i === phase ? "active" : "idle";

  return (
    <div className="pipe-wrap">
      <svg
        className="pipeline"
        viewBox="0 0 960 190"
        role="img"
        aria-label="Agent pipeline: prompt, agent, tool, inspection, evaluation, result"
      >
        <defs>
          <linearGradient id="scan" x1="0" x2="1">
            <stop offset="0" stopColor="#52c7f2" stopOpacity="0" />
            <stop offset="1" stopColor="#52c7f2" stopOpacity="0.45" />
          </linearGradient>
          <pattern id="ticks" width="20" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0V10M10 0V5" stroke="#363c42" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="168" width="960" height="10" fill="url(#ticks)" />
        <text className="node-sub" x="0" y="188">0 mm</text>
        <text className="node-sub" x="960" y="188" textAnchor="end">
          PIPELINE 6 STAGES
        </text>

        <g className={`neural ${running && (phase === 1 || phase === 2) ? "on" : ""}`}>
          {[[200, 16], [240, 8], [280, 16], [240, 30]].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <line x1="240" y1="49" x2={x} y2={y} />
              <circle cx={x} cy={y} r="3" />
            </g>
          ))}
        </g>

        {STAGES.slice(0, -1).map((_, i) => {
          const lit = phase > i;
          const flow = running && phase === i + 1;
          const x1 = xs[i] + 56;
          const x2 = xs[i + 1] - 56;
          return (
            <g key={i}>
              <line
                className={`link ${lit ? "lit" : ""} ${flow ? "flow" : ""}`}
                x1={x1}
                y1="85"
                x2={x2}
                y2="85"
              />
              {flow &&
                [0, 0.45].map((begin) => (
                  <circle key={begin} className="particle" r="3.5">
                    <animateMotion
                      dur="0.9s"
                      begin={`${begin}s`}
                      repeatCount="indefinite"
                      path={`M${x1} 85L${x2} 85`}
                    />
                  </circle>
                ))}
            </g>
          );
        })}

        {STAGES.map((stage, i) => {
          const st = stateOf(i);
          const isResult = i === STAGES.length - 1;
          const resultClass = isResult && st === "done" ? outcome || "" : "";
          const label =
            isResult && st === "done"
              ? outcome === "pass"
                ? "PASS"
                : outcome === "fail"
                  ? "FAIL"
                  : "LOGGED"
              : stage.label;
          return (
            <g
              key={stage.key}
              className={`node ${st} ${resultClass}`}
              transform={`translate(${xs[i] - 56} 49)`}
            >
              <rect className="node-body" width="112" height="72" rx="2" />
              <path
                className="node-brk"
                d="M0 10V0h10M102 0h10v10M112 62v10h-10M10 72H0V62"
              />
              <text className="node-idx" x="10" y="20">0{i + 1}</text>
              <circle className="node-led" cx="100" cy="16" r="3.5" />
              <text className="node-label" x="56" y="46" textAnchor="middle">
                {label}
              </text>
              <text className="node-sub" x="56" y="61" textAnchor="middle">
                {stage.sub}
              </text>
            </g>
          );
        })}

        {running && phase >= 3 && (
          <rect className="scanner" x="0" y="30" width="60" height="110" />
        )}
      </svg>
    </div>
  );
}

function Trace({ run, phase, outcome }) {
  const details = [
    run ? String(run.prompt || "—").slice(0, 70) : "Awaiting work order",
    run ? `Model: ${run.model || "—"}` : "Agent not assembled",
    run ? `Tool: ${get(run, "tool")}` : "No tool called",
    run ? `Decision: ${get(run, "decision")}` : "Inspection idle",
    run
      ? run.evaluation?.score !== undefined || run.result?.evaluation?.score !== undefined
        ? `Score: ${(run.evaluation || run.result.evaluation).score}/100`
        : "No score returned"
      : "Evaluation idle",
    run ? `Status: ${statusOf(run)}` : "No result yet"
  ];

  return (
    <div className="panel trace">
      <div className="label">Execution trace</div>
      <ol>
        {STAGES.map((s, i) => {
          const st = phase < 0 ? "idle" : i < phase ? "done" : i === phase ? "active" : "idle";
          const res = i === 5 && st === "done" ? outcome || "" : "";
          return (
            <li key={s.key} className={`${st} ${res}`}>
              <span className="dot">{st === "done" ? "OK" : `0${i + 1}`}</span>
              <div>
                <strong>{s.label} {s.sub.toLowerCase()}</strong>
                <small>{st === "done" || (st === "idle" && !run) ? details[i] : st === "active" ? "In progress…" : "Waiting"}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RunCard({ run, onFeedback }) {
  const [rating, setRating] = useState(run.feedback?.rating || "");
  const [comment, setComment] = useState(run.feedback?.comment || "");
  const [saving, setSaving] = useState(false);

  const submitFeedback = async () => {
    if (!rating) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/runs/${run._id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save feedback.");
      onFeedback?.(data.run || data);
    } catch (error) {
      alert(error.message || "Unable to submit feedback.");
    } finally {
      setSaving(false);
    }
  };

  const status = statusOf(run);
  const responseText = run.response || run.result?.response || "";
  const evaluation = run.evaluation || run.result?.evaluation || null;

  return (
    <article className="run-card">
      <div className="rc-head">
        <div>
          <div className="rc-title">{run.prompt || "Untitled run"}</div>
          <div className="rc-time">
            {formatDate(run.createdAt || run.timestamp || run.created_at)}
          </div>
        </div>
        <span className={`badge status-${status}`}>{status}</span>
      </div>

      <div className="spec">
        <div><span>Latency</span><strong>{formatLatency(run.latency_ms ?? run.latencyMs)}</strong></div>
        <div><span>Tokens</span><strong>{formatTokens(run.tokens ?? run.totalTokens)}</strong></div>
        <div><span>Est. cost</span><strong>{formatCost(run.cost ?? run.estimatedCost)}</strong></div>
        <div><span>Model</span><strong>{run.model || "—"}</strong></div>
        <div><span>Tool</span><strong>{get(run, "tool")}</strong></div>
        <div><span>Decision</span><strong>{get(run, "decision")}</strong></div>
        <div>
          <span>Eval score</span>
          <strong>{evaluation?.score !== undefined ? `${evaluation.score}/100` : "—"}</strong>
        </div>
      </div>

      {responseText && (
        <>
          <div className="label">Response</div>
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{responseText}</ReactMarkdown>
          </div>
        </>
      )}

      {evaluation && (evaluation.reason || evaluation.feedback) && (
        <>
          <div className="label">Inspection notes</div>
          <div className="notes">
            {evaluation.reason && <p>{evaluation.reason}</p>}
            {evaluation.feedback && <p>{evaluation.feedback}</p>}
          </div>
        </>
      )}

      <div className="label">Human feedback</div>
      <div className="feedback-controls">
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="">Select rating</option>
          <option value="1">1 — Poor</option>
          <option value="2">2 — Needs improvement</option>
          <option value="3">3 — Average</option>
          <option value="4">4 — Good</option>
          <option value="5">5 — Excellent</option>
        </select>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional feedback"
        />
        <button type="button" className="btn-ghost" onClick={submitFeedback} disabled={saving || !rating}>
          {saving ? "Saving..." : "Submit"}
        </button>
      </div>
    </article>
  );
}

function App() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [latestRun, setLatestRun] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tick, setTick] = useState(1);
  const [pipeFail, setPipeFail] = useState(false);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/runs`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load runs.");
      setRuns(Array.isArray(data) ? data : data.runs || []);
    } catch (err) {
      setError(err.message || "Unable to load runs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Visual progress while the real request is in flight; it holds at
  // Evaluation until the API responds, then the result stage resolves.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setTick((t) => Math.min(t + 1, 4)), 1100);
    return () => clearInterval(id);
  }, [running]);

  const runAgent = async () => {
    if (!prompt.trim()) {
      setRunError("Please enter a prompt.");
      return;
    }
    try {
      setTick(1);
      setPipeFail(false);
      setRunning(true);
      setRunError("");
      setLatestRun(null);

      const response = await fetch(`${API_URL}/api/ai/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Agent execution failed.");

      setLatestRun(data.run || data.result || data);
      setPrompt("");
      await fetchRuns();
    } catch (err) {
      setPipeFail(true);
      setRunError(err.message || "Unable to execute agent.");
    } finally {
      setRunning(false);
    }
  };

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        const text = String(run.prompt || "").toLowerCase();
        return (
          (!search.trim() || text.includes(search.toLowerCase())) &&
          (statusFilter === "all" || statusOf(run) === statusFilter.toLowerCase())
        );
      }),
    [runs, search, statusFilter]
  );

  const analytics = useMemo(() => {
    const total = runs.length;
    const successful = runs.filter((r) => OK.includes(statusOf(r))).length;
    const failed = runs.filter((r) => BAD.includes(statusOf(r))).length;
    const lat = runs.map((r) => Number(r.latency_ms ?? r.latencyMs)).filter(Number.isFinite);
    const tok = runs.map((r) => Number(r.tokens ?? r.totalTokens)).filter(Number.isFinite);
    return {
      total,
      successful,
      failed,
      rate: total ? Math.round((successful / total) * 100) : 0,
      failRate: total ? Math.round((failed / total) * 100) : 0,
      averageLatency: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0,
      totalTokens: tok.reduce((a, b) => a + b, 0)
    };
  }, [runs]);

  const updateFeedback = (updated) => {
    if (!updated?._id) return;
    setRuns((cur) => cur.map((r) => (r._id === updated._id ? updated : r)));
    if (latestRun?._id === updated._id) setLatestRun(updated);
  };

  const phase = running ? tick : latestRun || pipeFail ? 6 : -1;
  const outcome = pipeFail
    ? "fail"
    : latestRun
      ? OK.includes(statusOf(latestRun))
        ? "pass"
        : BAD.includes(statusOf(latestRun))
          ? "fail"
          : "unknown"
      : null;

  const readout = running
    ? `${STAGES[phase].label.toUpperCase()} ${STAGES[phase].sub.toUpperCase()} IN PROGRESS`
    : outcome === "pass"
      ? "BUILD PASSED"
      : outcome === "fail"
        ? "BUILD FAILED"
        : outcome
          ? "RUN LOGGED"
          : "STANDING BY";

  const recent = runs.slice(0, 5);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AO</div>
          <div>
            <div className="brand-name">AGENTOPS</div>
            <div className="brand-sub">AI ENGINEERING OBSERVABILITY</div>
          </div>
        </div>

        <nav className="nav" aria-label="Sections">
          <a href="#overview"><span>01</span>Overview</a>
          <a href="#history"><span>02</span>Runs</a>
          <a href="#latest"><span>03</span>Evaluations</a>
          <a href="#metrics"><span>04</span>Analytics</a>
          <a href="#workorder"><span>05</span>Work Orders</a>
          <a href="#activity"><span>06</span>System Logs</a>
        </nav>

        <div className="sys">
          <div>
            <i className={`led ${error ? "warn" : ""}`} />
            {error ? "API UNREACHABLE" : "SYSTEM OPERATIONAL"}
          </div>
          <div>RUNS LOGGED: {analytics.total}</div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <span>SITE // CONTROL ROOM</span>
          <button type="button" className="btn-ghost" onClick={fetchRuns} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && <div className="banner" role="alert">{error}</div>}

        <section id="overview" className="hero">
          <div className="eyebrow">AI CONSTRUCTION FACILITY</div>
          <h1>Site Control</h1>
          <p>Build. Inspect. Ship reliable agents. Every execution is assembled, traced and scored here.</p>
          <div className="hazard" />
          <div className={`panel pipe-panel ${running ? "is-running" : ""}`}>
            <Pipeline phase={phase} outcome={outcome} running={running} />
            <div className="readout">
              <span>STATUS: <b>{readout}</b></span>
              <span>STAGE: <b>{phase < 0 ? "—" : `${Math.min(phase + 1, 6)}/6`}</b></span>
              {latestRun && !running && <span>LATENCY: <b>{formatLatency(latestRun.latency_ms ?? latestRun.latencyMs)}</b></span>}
            </div>
          </div>
        </section>

        <section id="metrics" className="metrics" aria-label="Site diagnostics">
          <div className="gauge"><span>Total runs</span><strong>{analytics.total}</strong></div>
          <div className="gauge">
            <span>Success rate</span><strong>{analytics.total ? `${analytics.rate}%` : "—"}</strong>
            <div className="bar green"><i style={{ width: `${analytics.rate}%` }} /></div>
          </div>
          <div className="gauge">
            <span>Failed runs</span><strong>{analytics.failed}</strong>
            <div className="bar red"><i style={{ width: `${analytics.failRate}%` }} /></div>
          </div>
          <div className="gauge">
            <span>Avg latency</span>
            <strong>{analytics.averageLatency ? `${analytics.averageLatency} ms` : "—"}</strong>
          </div>
          <div className="gauge"><span>Total tokens</span><strong>{analytics.totalTokens.toLocaleString()}</strong></div>
        </section>

        <section id="workorder" className="sec">
          <div className="sec-head"><h2>New AI work order</h2><small>EXECUTE</small></div>
          <div className="panel order">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the task for the agent..."
              rows={4}
              disabled={running}
              aria-label="Agent prompt"
            />
            <div className="order-foot">
              <span className="route">MODEL: <b>{latestRun?.model || "auto"}</b></span>
              <span className="route">TOOL: <b>{latestRun ? get(latestRun, "tool") : "auto-select"}</b></span>
              <span className="route">{prompt.length} chars</span>
              <button type="button" className="btn-run" onClick={runAgent} disabled={running || !prompt.trim()}>
                {running && <span className="spin" />}
                {running ? "BUILDING..." : "RUN AGENT"}
              </button>
            </div>
            {runError && <div className="banner" role="alert">{runError}</div>}
          </div>
        </section>

        <section id="latest" className="sec">
          <div className="sec-head"><h2>Latest execution</h2><small>INSPECTION</small></div>
          <div className="latest-grid">
            {latestRun ? (
              <RunCard key={latestRun._id || "latest"} run={latestRun} onFeedback={updateFeedback} />
            ) : (
              <div className="empty-state">
                <strong>{running ? "Build in progress" : "No execution selected"}</strong>
                <span>{running ? "Waiting for the agent to finish." : "Submit a work order or pick a recent run."}</span>
              </div>
            )}
            <Trace run={latestRun} phase={phase} outcome={outcome} />
          </div>
        </section>

        <section id="activity" className="sec">
          <div className="sec-head"><h2>Recent activity</h2><small>SYSTEM LOG</small></div>
          <div className="activity">
            {recent.length === 0 ? (
              <div className="empty-state"><strong>No activity yet</strong></div>
            ) : (
              recent.map((run) => (
                <button type="button" key={run._id} className="act-row" onClick={() => setLatestRun(run)}>
                  <span className={`badge status-${statusOf(run)}`}>{statusOf(run)}</span>
                  <span className="act-prompt">{run.prompt || "Untitled run"}</span>
                  <span className="act-meta">{formatLatency(run.latency_ms ?? run.latencyMs)}</span>
                  <span className="act-meta">{formatDate(run.createdAt || run.timestamp || run.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section id="history" className="sec">
          <div className="sec-head"><h2>Run history</h2><small>ARCHIVE</small></div>
          <div className="run-filters">
            <input
              type="search"
              placeholder="Search runs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search runs"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state"><strong>Loading runs...</strong></div>
          ) : filteredRuns.length === 0 ? (
            <div className="empty-state">
              <strong>No runs found</strong>
              <span>Execute an agent or change your filters.</span>
            </div>
          ) : (
            <div className="runs-list">
              {filteredRuns.map((run) => (
                <RunCard key={run._id} run={run} onFeedback={updateFeedback} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
