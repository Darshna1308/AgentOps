import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = import.meta.env.VITE_API_URL;

/* =========================
   SUMMARY CARD
========================= */

function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="summary-card">
      <div className="summary-card-title">
        {title}
      </div>

      <div className="summary-card-value">
        {value}
      </div>

      <div className="summary-card-subtitle">
        {subtitle}
      </div>
    </div>
  );
}

/* =========================
   ANALYTICS BAR
========================= */

function AnalyticsBar({
  label,
  value,
  max = 100
}) {
  const width =
    max > 0
      ? Math.min((value / max) * 100, 100)
      : 0;

  const percentage =
    max > 0
      ? Math.round((value / max) * 100)
      : 0;

  return (
    <div className="analytics-bar-row">
      <div className="analytics-bar-label">
        <span>{label}</span>

        <strong>
          {value}{" "}
          <small>
            ({percentage}%)
          </small>
        </strong>
      </div>

      <div className="analytics-bar-track">
        <div
          className="analytics-bar-fill"
          style={{
            width: `${width}%`
          }}
        />
      </div>
    </div>
  );
}

/* =========================
   VISUAL ANALYTICS
========================= */

function VisualAnalytics({ runs }) {
  const successfulRuns = runs.filter(
    (run) => run.status === "success"
  ).length;

  const failedRuns = runs.filter(
    (run) => run.status === "failed"
  ).length;

  const toolRuns = runs.filter(
    (run) =>
      run.toolsUsed &&
      run.toolsUsed.length > 0
  ).length;

  const directRuns =
    runs.length - toolRuns;

  const averageLatency =
    runs.length > 0
      ? Math.round(
          runs.reduce(
            (sum, run) =>
              sum + (run.latency || 0),
            0
          ) / runs.length
        )
      : 0;

  const averageEvaluation =
    runs.length > 0
      ? (
          runs.reduce(
            (sum, run) =>
              sum +
              (run.evaluation?.overall || 0),
            0
          ) / runs.length
        ).toFixed(1)
      : "0.0";

  const maxLatency = Math.max(
    ...runs.map(
      (run) => run.latency || 0
    ),
    1
  );

  return (
    <section className="analytics-section">
      <div className="section-title">
        <h2>Visual Analytics</h2>

        <p>
          Monitoring agent performance,
          routing and reliability
        </p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-panel">
          <h3>Run Status</h3>

          <AnalyticsBar
            label="Successful"
            value={successfulRuns}
            max={Math.max(runs.length, 1)}
          />

          <AnalyticsBar
            label="Failed"
            value={failedRuns}
            max={Math.max(runs.length, 1)}
          />
        </div>

        <div className="analytics-panel">
          <h3>Agent Routing</h3>

          <AnalyticsBar
            label="Direct AI"
            value={directRuns}
            max={Math.max(runs.length, 1)}
          />

          <AnalyticsBar
            label="Tool Assisted"
            value={toolRuns}
            max={Math.max(runs.length, 1)}
          />
        </div>

        <div className="analytics-panel">
          <h3>Performance</h3>

          <div className="analytics-stat">
            <span>Average Latency</span>

            <strong>
              {averageLatency} ms
            </strong>
          </div>

          <div className="analytics-stat">
            <span>Average Evaluation</span>

            <strong>
              {averageEvaluation}/10
            </strong>
          </div>
        </div>
      </div>

      <div className="analytics-panel latency-panel">
        <h3>Latency by Run</h3>

        <div className="latency-chart">
          {runs.length === 0 ? (
            <div className="empty-state">
              No latency data yet.
            </div>
          ) : (
            runs
              .slice(0, 20)
              .reverse()
              .map((run, index) => {
                const latency =
                  run.latency || 0;

                const height = Math.max(
                  (latency / maxLatency) * 100,
                  4
                );

                return (
                  <div
                    className="latency-column"
                    key={
                      run._id || index
                    }
                  >
                    <div className="latency-value">
                      {latency}
                    </div>

                    <div
                      className="latency-bar"
                      style={{
                        height: `${height}%`
                      }}
                    />

                    <div className="latency-index">
                      #{index + 1}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================
   RUN FILTERS
========================= */

function RunFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  routeFilter,
  setRouteFilter
}) {
  return (
    <div className="run-filters">
      <input
        type="text"
        placeholder="Search prompts or responses..."
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
      />

      <select
        value={statusFilter}
        onChange={(event) =>
          setStatusFilter(event.target.value)
        }
      >
        <option value="all">
          All Status
        </option>

        <option value="success">
          Success
        </option>

        <option value="failed">
          Failed
        </option>
      </select>

      <select
        value={routeFilter}
        onChange={(event) =>
          setRouteFilter(event.target.value)
        }
      >
        <option value="all">
          All Routes
        </option>

        <option value="direct-ai">
          Direct AI
        </option>

        <option value="tool">
          Tool
        </option>
      </select>
    </div>
  );
}

/* =========================
   RUN TIMELINE
========================= */

function RunTimeline({ run }) {
  const steps = [
    {
      number: "01",
      title: "Prompt",
      detail: "Request received"
    },
    {
      number: "02",
      title: "Router",
      detail:
        run.agentDecision?.route ||
        "Route detected"
    },
    {
      number: "03",
      title: "AI / Tool",
      detail:
        run.toolsUsed?.length
          ? `${run.toolsUsed.length} tool${
              run.toolsUsed.length > 1
                ? "s"
                : ""
            } executed`
          : "AI service executed"
    },
    {
      number: "04",
      title: "Evaluation",
      detail:
        run.evaluation?.overall != null
          ? `Score ${run.evaluation.overall}/10`
          : "Evaluation completed"
    },
    {
      number: "05",
      title: "Result",
      detail:
        run.status === "success"
          ? "Execution completed"
          : "Execution failed"
    }
  ];

  return (
    <div className="run-timeline">
      {steps.map((step, index) => (
        <div
          className={`timeline-step ${
            run.status === "success"
              ? "completed"
              : index === 4
              ? "failed"
              : "completed"
          }`}
          key={step.number}
        >
          <div className="timeline-marker">
            {run.status === "success"
              ? "✓"
              : index === 4
              ? "!"
              : step.number}
          </div>

          <div className="timeline-content">
            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </div>

          {index < steps.length - 1 && (
            <div className="timeline-connector" />
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================
   RUN CARD
========================= */

function RunCard({ run, onFeedback }) {
  const [feedbackRating, setFeedbackRating] =
    useState(
      run.humanFeedback?.rating || ""
    );

  const [feedbackComment, setFeedbackComment] =
    useState(
      run.humanFeedback?.comment || ""
    );

  const [feedbackLoading, setFeedbackLoading] =
    useState(false);

  const [feedbackMessage, setFeedbackMessage] =
    useState("");

  const submitFeedback = async () => {
    if (!feedbackRating) {
      setFeedbackMessage(
        "Please select a rating."
      );

      return;
    }

    try {
      setFeedbackLoading(true);
      setFeedbackMessage("");

      const response = await fetch(
        `${API_URL}/api/runs/${run._id}/feedback`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            rating: feedbackRating,
            comment: feedbackComment
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save feedback"
        );
      }

      setFeedbackMessage(
        "Feedback saved successfully."
      );

      if (onFeedback) {
        onFeedback();
      }
    } catch (error) {
      setFeedbackMessage(
        error.message ||
          "Failed to save feedback."
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  const createdAt = run.createdAt
    ? new Date(
        run.createdAt
      ).toLocaleString()
    : "Unknown";

  return (
    <div className="run-card">

      {/* =========================
          RUN HEADER
      ========================= */}

      <div className="run-card-header">
        <div>
          <div className="run-status-row">
            <span
              className={`status-badge ${
                run.status === "success"
                  ? "status-success"
                  : "status-failed"
              }`}
            >
              {run.status}
            </span>

            <span className="run-date">
              {createdAt}
            </span>
          </div>

          <h3>{run.prompt}</h3>
        </div>

        <div className="run-id">
          {run._id}
        </div>
      </div>

      {/* =========================
          COLLAPSIBLE DETAILS
      ========================= */}

      <details className="run-details">
        <summary>
  <span>
    View execution details
  </span>
</summary>

        {/* =========================
            EXECUTION TIMELINE
        ========================= */}

        <RunTimeline run={run} />

        {/* =========================
            RUN METRICS
        ========================= */}

        <div className="run-metrics">
          <div>
            <span>Model</span>

            <strong>
              {run.model || "N/A"}
            </strong>
          </div>

          <div>
            <span>Latency</span>

            <strong>
              {run.latency || 0} ms
            </strong>
          </div>

          <div>
            <span>Tokens</span>

            <strong>
              {run.tokens || 0}
            </strong>
          </div>

          <div>
            <span>Cost</span>

            <strong>
              ${run.cost || 0}
            </strong>
          </div>

          <div>
            <span>Evaluation</span>

            <strong>
              {run.evaluation?.overall ??
                "N/A"}
            </strong>
          </div>
        </div>

        {/* =========================
            AGENT DECISION
        ========================= */}

        {run.agentDecision && (
          <div className="decision-section">
            <h4>Agent Decision</h4>

            <div className="decision-grid">
              <div>
                <span>Route</span>

                <strong>
                  {run.agentDecision.route}
                </strong>
              </div>

              <div>
                <span>Reason</span>

                <strong>
                  {run.agentDecision.reason}
                </strong>
              </div>

              <div>
                <span>
                  Tools Selected
                </span>

                <strong>
                  {run.agentDecision
                    .toolsSelected?.length
                    ? run.agentDecision.toolsSelected.join(
                        ", "
                      )
                    : "None"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* =========================
            TOOL CALLS
        ========================= */}

        {run.toolCalls &&
          run.toolCalls.length > 0 && (
            <div className="tool-section">
              <h4>Tool Calls</h4>

              {run.toolCalls.map(
                (tool, index) => (
                  <div
                    className="tool-call"
                    key={index}
                  >
                    <div className="tool-call-header">
                      <strong>
                        {tool.tool}
                      </strong>

                      <span
                        className={
                          tool.status ===
                          "success"
                            ? "tool-success"
                            : "tool-failed"
                        }
                      >
                        {tool.status}
                      </span>
                    </div>

                    <div className="tool-call-details">
                      <div>
                        <span>Input</span>

                        <p>
                          {tool.input}
                        </p>
                      </div>

                      <div>
                        <span>Output</span>

                        <p>
                          {tool.output}
                        </p>
                      </div>

                      <div>
                        <span>Latency</span>

                        <p>
                          {tool.latency} ms
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

        {/* =========================
            AGENT RESPONSE
        ========================= */}

        <div className="response-section">
          <h4>Agent Response</h4>

          <div className="markdown-content">
            {run.response ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {run.response}
              </ReactMarkdown>
            ) : (
              <span>
                No response available.
              </span>
            )}
          </div>
        </div>

        {/* =========================
            EVALUATION
        ========================= */}

        {run.evaluation && (
          <div className="evaluation-section">
            <h4>Evaluation</h4>

            <div className="evaluation-grid">
              <div>
                <span>Relevance</span>

                <strong>
                  {run.evaluation.relevance}
                  /10
                </strong>
              </div>

              <div>
                <span>Quality</span>

                <strong>
                  {run.evaluation.quality}
                  /10
                </strong>
              </div>

              <div>
                <span>Overall</span>

                <strong>
                  {run.evaluation.overall}
                  /10
                </strong>
              </div>
            </div>

            <p className="evaluation-reason">
              {run.evaluation.reason}
            </p>
          </div>
        )}

        {/* =========================
            HUMAN FEEDBACK
        ========================= */}

        <div className="feedback-section">
          <h4>Human Feedback</h4>

          <div className="feedback-controls">
            <button
              type="button"
              className={
                feedbackRating === "good"
                  ? "feedback-button active"
                  : "feedback-button"
              }
              onClick={() =>
                setFeedbackRating("good")
              }
            >
              👍 Good
            </button>

            <button
              type="button"
              className={
                feedbackRating ===
                "needs_improvement"
                  ? "feedback-button active"
                  : "feedback-button"
              }
              onClick={() =>
                setFeedbackRating(
                  "needs_improvement"
                )
              }
            >
              👎 Needs Improvement
            </button>
          </div>

          <textarea
            placeholder="Optional feedback comment..."
            value={feedbackComment}
            onChange={(event) =>
              setFeedbackComment(
                event.target.value
              )
            }
          />

          <button
            type="button"
            className="submit-feedback-button"
            onClick={submitFeedback}
            disabled={feedbackLoading}
          >
            {feedbackLoading
              ? "Saving..."
              : "Submit Feedback"}
          </button>

          {feedbackMessage && (
            <div className="feedback-message">
              {feedbackMessage}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

/* =========================
   APP
========================= */

function App() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  /* Run Agent state */
  const [prompt, setPrompt] =
    useState("");

  const [runLoading, setRunLoading] =
    useState(false);

  const [runError, setRunError] =
    useState("");

  const [runSuccess, setRunSuccess] =
    useState("");

  /* Interactive execution flow */
  const [activeFlowStep, setActiveFlowStep] =
    useState(null);

  /* Filters */
  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [routeFilter, setRouteFilter] =
    useState("all");

  /* =========================
     FETCH RUNS
  ========================= */

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/runs`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch runs"
        );
      }

      setRuns(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      setError(
        error.message ||
          "Failed to load runs."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RUN AGENT
  ========================= */

  const runAgent = async () => {
    if (!prompt.trim()) {
      setRunError(
        "Please enter a prompt."
      );

      setRunSuccess("");

      return;
    }

    try {
      setRunLoading(true);
      setRunError("");
      setRunSuccess("");

      // Start execution flow
      setActiveFlowStep(0);

      // Move to Router
      const routerTimer = setTimeout(() => {
        setActiveFlowStep(1);
      }, 500);

      // Move to AI / Tool
      const executionTimer = setTimeout(() => {
        setActiveFlowStep(2);
      }, 1000);

      const response = await fetch(
        `${API_URL}/api/ai/run`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt: prompt.trim()
          })
        }
      );

      const data =
        await response.json();

      clearTimeout(routerTimer);
      clearTimeout(executionTimer);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to run agent."
        );
      }

      // Evaluation stage
      setActiveFlowStep(3);

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      // Result stage
      setActiveFlowStep(4);

      setPrompt("");

      setRunSuccess(
        "Agent run completed successfully."
      );

      await fetchRuns();
    } catch (error) {
      setRunError(
        error.message ||
          "Failed to run agent."
      );
    } finally {
      setRunLoading(false);
    }
  };

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    fetchRuns();
  }, []);

  /* =========================
     FILTERED RUNS
  ========================= */

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        run.prompt
          ?.toLowerCase()
          .includes(searchText) ||
        run.response
          ?.toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        run.status === statusFilter;

      const matchesRoute =
        routeFilter === "all" ||
        run.agentDecision?.route ===
          routeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRoute
      );
    });
  }, [
    runs,
    search,
    statusFilter,
    routeFilter
  ]);

  /* =========================
     SUMMARY METRICS
  ========================= */

  const successfulRuns =
    runs.filter(
      (run) =>
        run.status === "success"
    ).length;

  const failedRuns =
    runs.filter(
      (run) =>
        run.status === "failed"
    ).length;

  const totalRuns = runs.length;

  const averageLatency =
    totalRuns > 0
      ? Math.round(
          runs.reduce(
            (sum, run) =>
              sum +
              (run.latency || 0),
            0
          ) / totalRuns
        )
      : 0;

  const averageEvaluation =
    totalRuns > 0
      ? (
          runs.reduce(
            (sum, run) =>
              sum +
              (run.evaluation
                ?.overall || 0),
            0
          ) / totalRuns
        ).toFixed(1)
      : "0.0";

  const totalTokens = runs.reduce(
    (sum, run) =>
      sum + (run.tokens || 0),
    0
  );

  const totalCost = runs.reduce(
    (sum, run) =>
      sum + (run.cost || 0),
    0
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <header className="dashboard-header">
        <div>
          <h1>AgentOps</h1>

          <p>
            Production AI Agent
            Monitoring &
            Evaluation Platform
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchRuns}
        >
          Refresh
        </button>
      </header>

      <main className="dashboard">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* =========================
            RUN AGENT
        ========================= */}

        <section className="run-agent-section">
          <div className="run-agent-header">
            <div>
              <span className="run-agent-eyebrow">
                EXECUTION CONTROL
              </span>

              <h2>Run Agent</h2>

              <p>
                Send a prompt and monitor
                the complete agent
                execution.
              </p>
            </div>

            <div className="run-agent-status">
              <span className="status-dot"></span>
              System Ready
            </div>
          </div>

          <div className="run-agent-input-area">
            <textarea
              value={prompt}
              onChange={(event) =>
                setPrompt(
                  event.target.value
                )
              }
              placeholder="What would you like the agent to do?"
            />

            <button
              type="button"
              onClick={runAgent}
              disabled={runLoading}
              className={`run-agent-button ${
                runLoading
                  ? "is-running"
                  : ""
              }`}
            >
              {runLoading ? (
                <>
                  <span className="button-spinner"></span>
                  Processing Agent...
                </>
              ) : (
                "Run Agent →"
              )}
            </button>
          </div>

          {/* =========================
              EXECUTION FLOW
          ========================= */}

          <div className="execution-flow">
            <div
              className={`flow-step ${
                activeFlowStep === 0
                  ? "active"
                  : ""
              }`}
            >
              <span className="flow-number">
                01
              </span>

              <span>Prompt</span>
            </div>

            <span className="flow-line"></span>

            <div
              className={`flow-step ${
                activeFlowStep === 1
                  ? "active"
                  : ""
              }`}
            >
              <span className="flow-number">
                02
              </span>

              <span>Router</span>
            </div>

            <span className="flow-line"></span>

            <div
              className={`flow-step ${
                activeFlowStep === 2
                  ? "active"
                  : ""
              }`}
            >
              <span className="flow-number">
                03
              </span>

              <span>AI / Tool</span>
            </div>

            <span className="flow-line"></span>

            <div
              className={`flow-step ${
                activeFlowStep === 3
                  ? "active"
                  : ""
              }`}
            >
              <span className="flow-number">
                04
              </span>

              <span>Evaluation</span>
            </div>

            <span className="flow-line"></span>

            <div
              className={`flow-step ${
                activeFlowStep === 4
                  ? "active"
                  : ""
              }`}
            >
              <span className="flow-number">
                05
              </span>

              <span>Result</span>
            </div>
          </div>

          {runError && (
            <div className="error-banner">
              {runError}
            </div>
          )}

          {runSuccess && (
            <div className="run-success">
              {runSuccess}
            </div>
          )}
        </section>

        {/* =========================
            SUMMARY
        ========================= */}

        <section className="summary-section">
          <SummaryCard
            title="Total Runs"
            value={totalRuns}
            subtitle="Tracked agent executions"
          />

          <SummaryCard
            title="Successful"
            value={successfulRuns}
            subtitle="Completed successfully"
          />

          <SummaryCard
            title="Failed"
            value={failedRuns}
            subtitle="Requires investigation"
          />

          <SummaryCard
            title="Avg Latency"
            value={`${averageLatency} ms`}
            subtitle="Average agent response time"
          />

          <SummaryCard
            title="Avg Evaluation"
            value={`${averageEvaluation}/10`}
            subtitle="Automated quality score"
          />

          <SummaryCard
            title="Total Tokens"
            value={totalTokens}
            subtitle="Tracked model usage"
          />

          <SummaryCard
            title="Total Cost"
            value={`$${totalCost.toFixed(
              6
            )}`}
            subtitle="Estimated AI cost"
          />
        </section>

        {/* =========================
            VISUAL ANALYTICS
        ========================= */}

        <VisualAnalytics
          runs={runs}
        />

        {/* =========================
            RUNS
        ========================= */}

        <section className="runs-section">
          <div className="section-title">
            <h2>Agent Runs</h2>

            <p>
              Inspect, filter and
              evaluate agent
              executions
            </p>
          </div>

          <RunFilters
            search={search}
            setSearch={setSearch}
            statusFilter={
              statusFilter
            }
            setStatusFilter={
              setStatusFilter
            }
            routeFilter={routeFilter}
            setRouteFilter={
              setRouteFilter
            }
          />

          {loading ? (
            <div className="empty-state">
              Loading runs...
            </div>
          ) : filteredRuns.length ===
            0 ? (
            <div className="empty-state">
              No runs match the
              current filters.
            </div>
          ) : (
            <div className="runs-list">
              {filteredRuns.map(
                (run) => (
                  <RunCard
                    key={run._id}
                    run={run}
                    onFeedback={
                      fetchRuns
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;