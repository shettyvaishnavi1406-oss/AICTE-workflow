import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function evcApiPlugin() {
  return {
    name: 'evc-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/api/evc/my-assignments/summary') {
          const role = req.headers['x-user-role'] || url.searchParams.get('role') || 'EVC Member';
          if (!role.includes('EVC') && !role.includes('Admin')) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Forbidden: Scoped strictly to authenticated EVC Members' }));
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            totalAssigned: 5,
            upcoming: 1,
            pending: 1,
            reportDue: 1,
            overdue: 1,
            completed: 1
          }));
          return;
        }

        if (url.pathname === '/api/evc/my-assignments') {
          const role = req.headers['x-user-role'] || url.searchParams.get('role') || 'EVC Member';
          if (!role.includes('EVC') && !role.includes('Admin')) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Forbidden: Scoped strictly to authenticated EVC Members' }));
            return;
          }
          // Signal to let service layer handle or return stub if called directly
          next();
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), evcApiPlugin()],
  server: {
    port: 5173,
    host: true
  }
});
