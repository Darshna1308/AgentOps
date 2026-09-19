const formatLog = (level, event, data = {}) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data
  });
};

const logger = {
  info(event, data = {}) {
    console.log(formatLog("info", event, data));
  },

  warn(event, data = {}) {
    console.warn(formatLog("warn", event, data));
  },

  error(event, data = {}) {
    console.error(formatLog("error", event, data));
  }
};

module.exports = logger;