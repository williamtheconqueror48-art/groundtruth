/**
 * Agent User-Agent request policy (TypeScript twin of agent-request-policy.json).
 *
 * The JSON file cannot be imported by the Vercel Edge Middleware bundler,
 * so this TS module inlines the same data for middleware.ts.
 * Keep in sync with agent-request-policy.json.
 */
export const agentRequestPolicy = {
  "userAgents": [
    "GPTBot",
    "ClaudeBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "ora-agent",
    "DeepSeekBot"
  ],
  "blockedResponse": {
    "error": "Forbidden",
    "code": "agent_request_blocked",
    "message": "The API request was blocked by the User-Agent policy.",
    "hint": "Use a descriptive User-Agent and an X-WorldMonitor-Key API key. See https://www.worldmonitor.app/auth.md."
  }
} as const;
export default agentRequestPolicy;
