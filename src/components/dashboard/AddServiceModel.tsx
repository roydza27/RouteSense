import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Server, Route, Globe, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({ isOpen, onClose, apiBase }) => {
  const [serviceName, setServiceName] = useState("My-Service");
  const [appPort, setAppPort] = useState("3000"); // State for the user's app port
  const [copiedMiddleware, setCopiedMiddleware] = useState(false);
  const [copiedRoutes, setCopiedRoutes] = useState(false);

  if (!isOpen) return null;

  // --- Snippet 1: The Middleware ---
  const middlewareSnippet = `
// 1. Add this middleware BEFORE your routes
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", async () => {
    try {
      await fetch("${apiBase.replace('/api', '')}/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: req.originalUrl,
          method: req.method,
          status: res.statusCode,
          responseTime: Date.now() - start,
          isError: res.statusCode >= 400,
          service: "${serviceName}" // <--- Your Service Name
        })
      });
    } catch (e) { /* Fail silently if collector is down */ }
  });
  next();
});
`.trim();

  // --- Snippet 2: The Test Routes ---
  const routesSnippet = `
// 2. Add these Test Routes to verify connection

// Fast route ⚡
app.get("/fast", (req, res) => res.json({ msg: "Fast!" }));

// Slow route 🐢
app.get("/slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 1200));
  res.json({ msg: "Slow..." });
});

// Error generator 🚨
app.get("/error", (req, res) => {
  if (Math.random() > 0.5) return res.status(500).json({ error: "Boom!" });
  res.json({ msg: "Lucky - no error" });
});

// Traffic Burster 🚀
app.get("/traffic", async (req, res) => {
  const routes = ["/fast", "/slow", "/error"];
  // Fire 5 requests without waiting
  for (let i = 0; i < 5; i++) {
    const route = routes[Math.floor(Math.random() * routes.length)];
    const port = process.env.PORT || ${appPort}; 
    fetch(\`http://localhost:\${port}\${route}\`).catch(()=>{});
  }
  res.json({ msg: "Traffic burst triggered" });
});
`.trim();

  // Helper to copy text
  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-[#0f1117]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Add New Service
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar bg-[#0f1117]">
          
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Service Name</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full h-10 px-4 rounded-lg bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              placeholder="e.g. User-Auth-Service"
            />
          </div>

          {/* --- BLOCK 1: MIDDLEWARE --- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
              <Server className="w-4 h-4" />
              <span>Step 1: The Middleware</span>
            </div>
            
            <div className="relative group border border-white/10 rounded-xl overflow-hidden bg-[#1e1e1e]">
              <button
                onClick={() => copyToClipboard(middlewareSnippet, setCopiedMiddleware)}
                className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-muted-foreground hover:text-white"
              >
                {copiedMiddleware ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <SyntaxHighlighter
                language="javascript"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem', background: '#1e1e1e' }}
                wrapLongLines={true}
              >
                {middlewareSnippet}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* --- BLOCK 2: TEST ROUTES --- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-400">
              <Route className="w-4 h-4" />
              <span>Step 2: Test API Routes</span>
            </div>

            <div className="relative group border border-white/10 rounded-xl overflow-hidden bg-[#1e1e1e]">
              <button
                onClick={() => copyToClipboard(routesSnippet, setCopiedRoutes)}
                className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-muted-foreground hover:text-white"
              >
                {copiedRoutes ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <SyntaxHighlighter
                language="javascript"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem', background: '#1e1e1e' }}
                wrapLongLines={true}
              >
                {routesSnippet}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* --- BLOCK 3: BROWSER LINKS (NEW) --- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <Globe className="w-4 h-4" />
                    <span>Step 3: Test in Browser</span>
                </div>
                {/* Port Input */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Your App Port:</span>
                    <input
                        type="text"
                        value={appPort}
                        onChange={e => setAppPort(e.target.value)}
                        className="w-16 h-7 px-2 rounded bg-white/5 border border-white/10 text-center text-white focus:border-primary outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['traffic', 'fast', 'slow', 'error'].map((route) => (
                    <a
                        key={route}
                        href={`http://localhost:${appPort}/${route}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-[#1e1e1e] hover:bg-white/5 hover:border-white/20 transition-all group"
                    >
                        <span className="font-mono text-sm text-blue-300">
                            http://localhost:{appPort}/{route}
                        </span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                    </a>
                ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end shrink-0 bg-[#0f1117]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};