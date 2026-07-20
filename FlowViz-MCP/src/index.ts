#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { PowerBIClient } from "./powerbi.js";
import { registerCycleTimeTool } from "./tools/cycle-time.js";
import { registerThroughputTool } from "./tools/throughput.js";
import { registerWipTool } from "./tools/wip.js";
import { registerAgingTool } from "./tools/aging.js";
import { registerFlowEfficiencyTool } from "./tools/flow-efficiency.js";
import { registerBlockedTool } from "./tools/blocked.js";
import { registerForecastTool } from "./tools/forecast.js";

async function main() {
  const config = loadConfig();
  const client = new PowerBIClient(config);

  const sourceLabel =
    config.sourceType === "ado" ? "Azure DevOps" : "Jira";

  const server = new McpServer(
    {
      name: "flowviz-mcp",
      version: "0.1.0",
    },
    {
      instructions:
        `This server queries FlowViz flow metrics from a published Power BI dataset. ` +
        `This instance is connected to a ${sourceLabel} FlowViz dataset.\n\n` +
        `Available tools:\n` +
        `- get_cycle_time: Cycle time percentiles (50th, 85th, or any), average, and max\n` +
        `- get_throughput: Completed item counts, bug rate, weekly breakdowns\n` +
        `- get_wip: Average daily WIP, net flow (started vs completed)\n` +
        `- get_aging: Work item age, probability of exceeding 85th percentile cycle time\n` +
        `- get_flow_efficiency: Ratio of active time to total time, time in column breakdown\n` +
        `- get_blocked: Blocked item counts, days lost, currently blocked items\n` +
        `- run_forecast: Monte Carlo simulation for delivery date forecasting\n\n` +
        `Most tools accept optional filters: days (lookback period) and workItemType. ` +
        `When the user asks about flow metrics, use the most specific tool for their question. ` +
        `For broad questions like "how is the team doing", combine results from multiple tools.`,
    }
  );

  registerCycleTimeTool(server, client, config.sourceType);
  registerThroughputTool(server, client, config.sourceType);
  registerWipTool(server, client, config.sourceType);
  registerAgingTool(server, client, config.sourceType);
  registerFlowEfficiencyTool(server, client, config.sourceType);
  registerBlockedTool(server, client, config.sourceType);
  registerForecastTool(server, client, config.sourceType);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`FlowViz MCP server running (${sourceLabel} mode)`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
