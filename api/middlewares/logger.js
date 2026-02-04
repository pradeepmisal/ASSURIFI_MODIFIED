/**
 * Simple request logger middleware
 * Prints: [Method] [URL] - [Timestamp]
 */
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${req.method}] ${req.url} - ${timestamp}`);
  next();
};

export default logger;
