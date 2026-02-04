import app from './app.js';

// Export the Express app as the default export.
// This allows Vercel or any other importer to treat this file exactly as they did before,
// receiving an Express application instance that handles the requests.
export default app;

// Re-export Vercel config if needed (though cleaner to move to app.js or keep here if specific to entry point)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
