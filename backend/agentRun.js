const mongoose = require("mongoose");

const agentRunSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  },

  response: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    required: true
  },

  model: {
    type: String,
    required: true
  },

  latency: {
    type: Number,
    required: true
  },

  tokens: {
    type: Number,
    required: true
  },

  cost: {
    type: Number,
    required: true
  },

  /*
    Tools used during the agent run.
  */
  toolsUsed: {
    type: [String],
    default: []
  },

  /*
    Tool execution trace.
  */
  toolCalls: {
    type: [
      {
        tool: {
          type: String,
          required: true
        },

        input: {
          type: String,
          default: ""
        },

        output: {
          type: String,
          default: ""
        },

        status: {
          type: String,
          enum: ["success", "failed"],
          default: "success"
        },

        latency: {
          type: Number,
          default: 0
        }
      }
    ],

    default: []
  },

  /*
    Observable agent routing decision.

    This records what type of request
    the agent detected and why a tool
    was selected.

    It does NOT store private reasoning.
  */
  agentDecision: {
    route: {
      type: String,
      default: "direct-ai"
    },

    reason: {
      type: String,
      default: ""
    },

    toolsSelected: {
      type: [String],
      default: []
    }
  },

  /*
    AI response evaluation.
  */
  evaluation: {
    relevance: {
      type: Number,
      default: null
    },

    quality: {
      type: Number,
      default: null
    },

    overall: {
      type: Number,
      default: null
    },

    reason: {
      type: String,
      default: ""
    }
  },

  /*
    Human feedback.
  */
  humanFeedback: {
    rating: {
      type: String,
      enum: ["good", "needs_improvement", null],
      default: null
    },

    comment: {
      type: String,
      default: ""
    },

    submittedAt: {
      type: Date,
      default: null
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "AgentRun",
  agentRunSchema
);