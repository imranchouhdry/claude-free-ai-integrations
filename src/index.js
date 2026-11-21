
import { env } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "claude-free-ai",
    version: "1.0.0"
  });

  server.registerTool(
    "ask_free_ai",
    {
      description: "Ask a question using a free OpenRouter AI model",
      inputSchema: {
        prompt: z.string().min(1).describe("Your question")
      }
    },
    async ({ prompt }) => {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: env.OPENROUTER_MODEL,
            messages: [{ role: "user", content: prompt }]
          })
        }
      );

      if (!response.ok) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `OpenRouter error: ${await response.text()}`
          }]
        };
      }

      const data = await response.json();

      return {
        content: [{
          type: "text",
          text: data.choices?.[0]?.message?.content ||
            "No response received."
        }]
      };
    }
  );

  return server;
}

const handler = createMcpHandler(createServer);

export default {
  async fetch(request, workerEnv, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Claude Free AI MCP Server is running.");
    }

    if (url.pathname === "/mcp") {
      const token = request.headers.get("Authorization");

      if (token !== `Bearer ${env.MCP_ACCESS_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return handler(request, workerEnv, ctx);
  }
};
