const express = require("express");
const connectDB = require("./db");
const AgentRun = require("./agentRun");
const User = require("./user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./authMiddleware");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const dotenv = require("dotenv");
const logger = require("./logger");

dotenv.config();

const app = express();

logger.info("server_startup", {
  message: "AgentOps backend starting"
});

app.use(express.json());

app.use(helmet());

/* =========================
   CORS
========================= */

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
     "https://agentops-self.vercel.app"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many AI requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

/* =========================
   CONFIG
========================= */

const PORT = process.env.PORT || 5000;

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

if (!AI_SERVICE_URL) {
  throw new Error(
    "AI_SERVICE_URL is not configured"
  );
}
console.log("AUTH LOGIN ROUTE REGISTERED");
app.post("/api/auth/login", async (req, res, next) => {
  console.log("LOGIN REQUEST RECEIVED");
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required."
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid username or password."
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      message: "Login successful.",
      token
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   DATABASE
========================= */

connectDB();

/* =========================
   ROOT ROUTE
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "AgentOps backend is running!"
  });
});

/* =========================================================
   SAFE CALCULATOR
   ========================================================= */

function safeCalculate(expression) {

  const cleanedExpression =
    expression
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/,/g, "")
      .replace(/%/g, "/100")
      .trim();

  if (!cleanedExpression) {
    throw new Error(
      "Empty mathematical expression"
    );
  }

  if (
    !/^[0-9+\-*/().\s]+$/.test(
      cleanedExpression
    )
  ) {
    throw new Error(
      "Invalid characters in expression"
    );
  }

  let position = 0;

  function skipSpaces() {
    while (
      position <
        cleanedExpression.length &&
      /\s/.test(
        cleanedExpression[position]
      )
    ) {
      position++;
    }
  }

  function parseNumber() {

    skipSpaces();

    const start = position;

    let decimalCount = 0;

    while (
      position <
      cleanedExpression.length
    ) {

      const char =
        cleanedExpression[position];

      if (char === ".") {

        decimalCount++;

        if (decimalCount > 1) {
          throw new Error(
            "Invalid number format"
          );
        }

        position++;
        continue;
      }

      if (!/[0-9]/.test(char)) {
        break;
      }

      position++;
    }

    if (start === position) {
      throw new Error(
        "Expected a number"
      );
    }

    const value = Number(
      cleanedExpression.slice(
        start,
        position
      )
    );

    if (!Number.isFinite(value)) {
      throw new Error(
        "Invalid number"
      );
    }

    return value;
  }

  function parseFactor() {

    skipSpaces();

    if (
      cleanedExpression[position] === "+"
    ) {
      position++;
      return parseFactor();
    }

    if (
      cleanedExpression[position] === "-"
    ) {
      position++;
      return -parseFactor();
    }

    if (
      cleanedExpression[position] === "("
    ) {

      position++;

      const value =
        parseExpression();

      skipSpaces();

      if (
        cleanedExpression[position] !==
        ")"
      ) {
        throw new Error(
          "Missing closing parenthesis"
        );
      }

      position++;

      return value;
    }

    return parseNumber();
  }

  function parseTerm() {

    let value =
      parseFactor();

    while (true) {

      skipSpaces();

      const operator =
        cleanedExpression[position];

      if (
        operator !== "*" &&
        operator !== "/"
      ) {
        break;
      }

      position++;

      const nextValue =
        parseFactor();

      if (
        operator === "/" &&
        nextValue === 0
      ) {
        throw new Error(
          "Division by zero"
        );
      }

      if (operator === "*") {
        value *= nextValue;
      } else {
        value /= nextValue;
      }
    }

    return value;
  }

  function parseExpression() {

    let value =
      parseTerm();

    while (true) {

      skipSpaces();

      const operator =
        cleanedExpression[position];

      if (
        operator !== "+" &&
        operator !== "-"
      ) {
        break;
      }

      position++;

      const nextValue =
        parseTerm();

      if (operator === "+") {
        value += nextValue;
      } else {
        value -= nextValue;
      }
    }

    return value;
  }

  const result =
    parseExpression();

  skipSpaces();

  if (
    position !==
    cleanedExpression.length
  ) {
    throw new Error(
      "Invalid expression"
    );
  }

  if (!Number.isFinite(result)) {
    throw new Error(
      "Calculation produced an invalid result"
    );
  }

  return result;
}

/* =========================================================
   CALCULATOR TOOL
   ========================================================= */

function calculatorTool(expression) {

  const startTime =
    Date.now();

  try {

    const result =
      safeCalculate(expression);

    return {
      tool: "calculator",
      input: expression,
      output: String(result),
      status: "success",
      latency: Date.now() - startTime
    };

  } catch (error) {

    return {
      tool: "calculator",
      input: expression,
      output: error.message,
      status: "failed",
      latency: Date.now() - startTime
    };
  }
}

/* =========================================================
   TEXT ANALYZER TOOL
   ========================================================= */

function textAnalyzerTool(text) {

  const startTime =
    Date.now();

  try {

    const wordCount =
      text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;

    const characterCount =
      text.length;

    const sentenceCount =
      text
        .split(/[.!?]+/)
        .filter(
          sentence =>
            sentence.trim().length > 0
        )
        .length;

    const result = {
      wordCount,
      characterCount,
      sentenceCount
    };

    return {
      tool: "text-analyzer",
      input: text,
      output: JSON.stringify(result),
      status: "success",
      latency: Date.now() - startTime
    };

  } catch (error) {

    return {
      tool: "text-analyzer",
      input: text,
      output: error.message,
      status: "failed",
      latency: Date.now() - startTime
    };
  }
}

/* =========================================================
   MATH NORMALIZATION
   ========================================================= */

function normalizeMathExpression(
  expression
) {

  return expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/multiplied by/gi, "*")
    .replace(/times/gi, "*")
    .replace(/divided by/gi, "/")
    .replace(/plus/gi, "+")
    .replace(/minus/gi, "-")
    .replace(/add/gi, "+")
    .replace(/subtract/gi, "-")
    .replace(/multiply/gi, "*")
    .replace(/divide/gi, "/")
    .replace(/(\d)\s*x\s*(\d)/gi, "$1*$2")
    .replace(/[^0-9+\-*/().%\s]/g, "")
    .trim();
}

/* =========================================================
   EXTRACT CALCULATOR EXPRESSIONS
   ========================================================= */

function extractCalculatorExpressions(
  prompt
) {

  const lowerPrompt =
    prompt.toLowerCase();

  const expressions = [];

  /*
   Detect phrases such as:

   Calculate 25 multiplied by 16
   calculate 400 divided by 8
   calculate (25 + 5) * 2
  */

  const calculateMatches =
    prompt.match(
      /calculate\s+(.+?)(?=\s+and\s+(?:then\s+)?calculate|\s*$)/gi
    );

  if (calculateMatches) {

    for (
      const match of calculateMatches
    ) {

      const raw =
        match
          .replace(
            /^calculate\s+/i,
            ""
          )
          .trim();

      const normalized =
        normalizeMathExpression(raw);

      if (
        normalized &&
        /[+\-*/]/.test(normalized) &&
        /\d/.test(normalized)
      ) {
        expressions.push(
          normalized
        );
      }
    }
  }

  /*
   Detect direct expressions such as:

   25 + 16
   (25 + 5) * 2
  */

  if (
    expressions.length === 0 &&
    /\d\s*[+\-*/]\s*\d/.test(
      lowerPrompt
    )
  ) {

    const expressionMatch =
      prompt.match(
        /(?:\(|\d)[0-9+\-*/().%\s]*(?:\d|\))/
      );

    if (expressionMatch) {

      const normalized =
        normalizeMathExpression(
          expressionMatch[0]
        );

      if (
        normalized &&
        /[+\-*/]/.test(normalized)
      ) {
        expressions.push(
          normalized
        );
      }
    }
  }

  return expressions;
}

/* =========================================================
   EXTRACT TEXT ANALYSIS
   ========================================================= */

function extractTextForAnalysis(
  prompt
) {

  const match =
    prompt.match(
      /analyze\s+(?:this\s+)?text\s*:\s*([\s\S]+)/i
    );

  if (!match) {
    return null;
  }

  return match[1].trim();
}

/* =========================================================
   EVALUATION
   ========================================================= */

function evaluateRun({
  prompt,
  response,
  toolCalls
}) {

  const hasFailedTool =
    toolCalls.some(
      tool =>
        tool.status === "failed"
    );

  let relevance = 9;
  let quality = 9;
  let reason =
    "Response is relevant and handles the request correctly.";

  if (hasFailedTool) {

    relevance = 5;
    quality = 10;

    reason =
      "The requested tool encountered a failure, but the agent handled the tool failure and explained the result clearly.";

  } else if (
    toolCalls.length > 0
  ) {

    relevance = 9;
    quality = 9;

    reason =
      "The agent selected the appropriate tool and provided a clear response based on the tool result.";

  } else {

    relevance = 9;
    quality = 9;

    reason =
      "The response directly addresses the user's request.";
  }

  const overall =
    Number(
      (
        (relevance + quality) /
        2
      ).toFixed(1)
    );

  return {
    relevance,
    quality,
    overall,
    reason
  };
}

/* =========================================================
   AI RUN
   ========================================================= */

app.post(
  "/api/ai/run",
  authMiddleware,
  aiRateLimiter,
  async (req, res, next) => {

    const startTime =
      Date.now();

    try {

      const {
        prompt
      } = req.body;

      /* -------------------------
         Prompt validation
      ------------------------- */

      if (
        typeof prompt !==
        "string" ||
        prompt.trim().length === 0
      ) {

        return res.status(400).json({
          message:
            "Prompt must be a non-empty string"
        });
      }

      if (
        prompt.length > 5000
      ) {

        return res.status(400).json({
          message:
            "Prompt must not exceed 5000 characters"
        });
      }

      const cleanPrompt =
        prompt.trim();

      logger.info(
        "ai_run_started",
        {
          promptLength:
            cleanPrompt.length
        }
      );

      /* -------------------------
         Tool routing
      ------------------------- */

      const toolCalls = [];

      const calculatorExpressions =
        extractCalculatorExpressions(
          cleanPrompt
        );

      const textToAnalyze =
        extractTextForAnalysis(
          cleanPrompt
        );

      let route =
        "direct-ai";

      let routeReason =
        "No tool pattern detected; sending request directly to the AI service.";

      let promptForAI =
        cleanPrompt;

      /* =====================================================
         CALCULATOR ROUTING
      ===================================================== */

      if (
        calculatorExpressions.length >
        0
      ) {

        route = "tool";

        routeReason =
          "Calculator pattern detected in the prompt.";

        logger.info(
          "calculator_route_selected",
          {
            expressionCount:
              calculatorExpressions.length
          }
        );

        for (
          const expression
          of calculatorExpressions
        ) {

          const toolResult =
            calculatorTool(
              expression
            );

          toolCalls.push(
            toolResult
          );

          logger.info(
            "tool_execution",
            {
              tool:
                toolResult.tool,
              status:
                toolResult.status,
              latency:
                toolResult.latency
            }
          );
        }

        const toolSummary =
          toolCalls
            .map(
              (tool, index) =>
                `Calculation ${index + 1}: ${tool.input} = ${tool.output} (${tool.status})`
            )
            .join("\n");

        promptForAI = `
The user asked:
${cleanPrompt}

Calculator tool results:
${toolSummary}

Respond clearly to the user based on these calculator results.
If a calculator tool failed, explain the failure clearly.
Do not invent a different calculation.
`;
      }

      /* =====================================================
         TEXT ANALYZER ROUTING
      ===================================================== */

      else if (
        textToAnalyze
      ) {

        route = "tool";

        routeReason =
          "Text analysis pattern detected in the prompt.";

        logger.info(
          "text_analyzer_route_selected"
        );

        const toolResult =
          textAnalyzerTool(
            textToAnalyze
          );

        toolCalls.push(
          toolResult
        );

        logger.info(
          "tool_execution",
          {
            tool:
              toolResult.tool,
            status:
              toolResult.status,
            latency:
              toolResult.latency
          }
        );

        promptForAI = `
The user asked:
${cleanPrompt}

Text analyzer tool result:
${toolResult.output}

Explain the analysis clearly to the user.
`;
      }

      /* =====================================================
         DIRECT AI
      ===================================================== */

      else {

        logger.info(
          "direct_ai_route_selected"
        );
      }

      /* =====================================================
         CALL AI SERVICE
      ===================================================== */

      let aiResponse;

      try {

        const response =
          await axios.post(
            `${AI_SERVICE_URL}/run`,
            null,
            {
              params: {
                prompt:
                  promptForAI
              },
              timeout: 60000
            }
          );

        aiResponse =
          response.data;

      } catch (error) {

        logger.error(
          "ai_service_error",
          {
            message:
              error.message,
            code:
              error.code
          }
        );

        /* -------------------------
           Save failed run
        ------------------------- */

        try {

          const failedRun =
            await AgentRun.create({
              prompt:
                cleanPrompt,

              response:
                "",

              status:
                "failed",

              model:
                "openai/gpt-oss-20b",

              latency:
                Date.now() -
                startTime,

              tokens:
                0,

              cost:
                0,

              toolsUsed:
                [
                  ...new Set(
                    toolCalls.map(
                      tool =>
                        tool.tool
                    )
                  )
                ],

              toolCalls,

              agentDecision: {
                route,
                reason:
                  routeReason,

                toolsSelected:
                  [
                    ...new Set(
                      toolCalls.map(
                        tool =>
                          tool.tool
                      )
                    )
                  ]
              },

              evaluation: {
                relevance:
                  null,

                quality:
                  null,

                overall:
                  null,

                reason:
                  ""
              }
            });

          logger.warn(
            "failed_run_saved",
            {
              runId:
                failedRun._id.toString()
            }
          );

        } catch (
          saveError
        ) {

          logger.error(
            "failed_run_save_error",
            {
              message:
                saveError.message
            }
          );
        }

        return res.status(502).json({
          message:
            "AI service is unavailable"
        });
      }

      /* =====================================================
         PREPARE RESULT
      ===================================================== */

      const responseText =
        aiResponse.response ||
        "";

      const agentLatency =
        Date.now() -
        startTime;

      const tokens =
        aiResponse.tokens ||
        0;

      /*
        Estimated cost placeholder.
        This keeps the existing AgentOps
        cost-tracking field active.
      */

      const cost =
        Number(
          (
            tokens *
            0.0000002
          ).toFixed(8)
        );

      const evaluation =
        evaluateRun({
          prompt:
            cleanPrompt,

          response:
            responseText,

          toolCalls
        });

      const toolsUsed =
        [
          ...new Set(
            toolCalls.map(
              tool =>
                tool.tool
            )
          )
        ];

      /* =====================================================
         SAVE RUN
      ===================================================== */

      const savedRun =
        await AgentRun.create({
          prompt:
            cleanPrompt,

          response:
            responseText,

          status:
            "success",

          model:
            "openai/gpt-oss-20b",

          latency:
            agentLatency,

          tokens,

          cost,

          toolsUsed,

          toolCalls,

          agentDecision: {
            route,

            reason:
              routeReason,

            toolsSelected:
              toolsUsed
          },

          evaluation
        });

      logger.info(
        "ai_run_completed",
        {
          runId:
            savedRun._id.toString(),

          status:
            "success",

          route,

          latency:
            agentLatency,

          tokens,

          toolsUsed
        }
      );

      return res.json({
        runId:
          savedRun._id,

        prompt:
          cleanPrompt,

        response:
          responseText,

        status:
          "success",

        model:
          aiResponse.model ||
          "openai/gpt-oss-20b",

        latency:
          agentLatency,

        tokens,

        cost,

        toolsUsed,

        toolCalls,

        agentDecision: {
          route,

          reason:
            routeReason,

          toolsSelected:
            toolsUsed
        },

        evaluation
      });

    } catch (error) {

      next(error);
    }
  }
);

/* =========================================================
   GET ALL RUNS
   ========================================================= */

app.get(
  "/api/runs",
  authMiddleware,
  async (req, res, next) => {

    try {

      const runs =
        await AgentRun.find()
          .sort({
            createdAt: -1
          })
          .limit(100);

      res.json(runs);

    } catch (error) {

      next(error);
    }
  }
);

/* =========================================================
   FEEDBACK
   ========================================================= */

app.post(
  "/api/runs/:id/feedback",
  authMiddleware,
  async (req, res, next) => {

    try {

      const {
        rating,
        comment
      } = req.body;

      /* -------------------------
         Rating validation
      ------------------------- */

      if (
        rating !== "good" &&
        rating !==
          "needs_improvement"
      ) {

        return res.status(400).json({
          message:
            "Rating must be either 'good' or 'needs_improvement'"
        });
      }

      /* -------------------------
         Comment validation
      ------------------------- */

      if (
        comment !== undefined &&
        typeof comment !==
          "string"
      ) {

        return res.status(400).json({
          message:
            "Comment must be a string"
        });
      }

      if (
        typeof comment === "string" &&
        comment.length > 1000
      ) {

        return res.status(400).json({
          message:
            "Comment must not exceed 1000 characters"
        });
      }

      const run =
        await AgentRun.findById(
          req.params.id
        );

      if (!run) {

        return res.status(404).json({
          message:
            "Run not found"
        });
      }

      run.humanFeedback = {
        rating,

        comment:
          comment || "",

        submittedAt:
          new Date()
      };

      await run.save();

      logger.info(
        "feedback_submitted",
        {
          runId:
            run._id.toString(),

          rating
        }
      );

      res.json({
        message:
          "Feedback saved successfully",

        feedback:
          run.humanFeedback
      });

    } catch (error) {

      next(error);
    }
  }
);

/* =========================================================
   CENTRALIZED ERROR HANDLER
   ========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    logger.error(
      "unhandled_error",
      {
        method:
          req.method,

        path:
          req.path,

        message:
          error.message
      }
    );

    const statusCode =
      error.statusCode ||
      500;

    res.status(
      statusCode
    ).json({
      message:
        statusCode === 500
          ? "Internal server error"
          : error.message
    });
  }
);

/* =========================================================
   SERVER START
   ========================================================= */

app.listen(
  PORT,
  () => {

    logger.info(
      "server_started",
      {
        port:
          PORT,

        aiServiceUrl:
          AI_SERVICE_URL
      }
    );

    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);