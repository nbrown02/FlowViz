import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable } from "../table-map.js";

export const forecastInputSchema = z.object({
  remainingItems: z
    .number()
    .min(1)
    .describe("Number of remaining items to forecast completion for."),
  weeksOfHistory: z
    .number()
    .min(4)
    .optional()
    .describe(
      "Number of weeks of historical throughput to use for the simulation. " +
      "Defaults to 12 weeks. More history gives more stable results."
    ),
  simulations: z
    .number()
    .min(100)
    .max(10000)
    .optional()
    .describe(
      "Number of Monte Carlo simulations to run. Defaults to 1000. " +
      "More simulations give more precise percentiles."
    ),
});

export function registerForecastTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "run_forecast",
    {
      title: "Run Monte Carlo forecast",
      description:
        "Run a Monte Carlo simulation to forecast when a number of remaining items " +
        "will be completed, based on historical throughput data from your FlowViz dataset. " +
        "Returns probability-based date ranges (50th, 85th, 95th percentile). " +
        "Specify how many items remain and optionally how many weeks of history to sample from.",
      inputSchema: forecastInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const weeksOfHistory = args.weeksOfHistory ?? 12;
        const numSimulations = args.simulations ?? 1000;
        const remaining = args.remainingItems;

        // Get weekly throughput history
        const table = getTable("throughput", sourceType);
        const dax =
          `EVALUATE ` +
          `SUMMARIZE(` +
          `CALCULATETABLE(` +
          `'${table}', ` +
          `DATESINPERIOD(Dates[Date], TODAY(), -${weeksOfHistory * 7}, DAY)` +
          `), ` +
          `Dates[WeekStartingDate], ` +
          `"Weekly_Throughput", [CompletedItems2]` +
          `)`;

        const result = await client.executeDax(dax);
        const rows = result.tables?.[0]?.rows ?? [];

        if (rows.length < 2) {
          return {
            content: [
              {
                type: "text",
                text:
                  "Not enough historical data for a forecast. " +
                  `Found ${rows.length} week(s) of data, need at least 2. ` +
                  "Try increasing weeksOfHistory or check that the dataset has enough completed items.",
              },
            ],
          };
        }

        // Extract weekly throughput values
        const weeklyThroughput = rows
          .map((r) => {
            const val = r["Weekly_Throughput"] ?? r["[Weekly_Throughput]"];
            return typeof val === "number" ? val : Number(val);
          })
          .filter((v) => !isNaN(v) && v >= 0);

        if (weeklyThroughput.length < 2) {
          return {
            content: [
              {
                type: "text",
                text: "Not enough valid throughput data points for simulation.",
              },
            ],
          };
        }

        // Run Monte Carlo simulation
        const weeksToComplete: number[] = [];

        for (let sim = 0; sim < numSimulations; sim++) {
          let itemsLeft = remaining;
          let weeks = 0;
          const maxWeeks = 200; // safety cap

          while (itemsLeft > 0 && weeks < maxWeeks) {
            // Random sample from historical throughput
            const idx = Math.floor(Math.random() * weeklyThroughput.length);
            itemsLeft -= weeklyThroughput[idx];
            weeks++;
          }

          weeksToComplete.push(weeks);
        }

        // Sort and extract percentiles
        weeksToComplete.sort((a, b) => a - b);

        const p50 = weeksToComplete[Math.floor(numSimulations * 0.5)];
        const p85 = weeksToComplete[Math.floor(numSimulations * 0.85)];
        const p95 = weeksToComplete[Math.floor(numSimulations * 0.95)];

        const today = new Date();
        const addWeeks = (w: number) => {
          const d = new Date(today);
          d.setDate(d.getDate() + w * 7);
          return d.toISOString().split("T")[0];
        };

        const avgThroughput =
          weeklyThroughput.reduce((a, b) => a + b, 0) / weeklyThroughput.length;

        const output = {
          inputs: {
            remainingItems: remaining,
            weeksOfHistory,
            simulations: numSimulations,
            dataPointsUsed: weeklyThroughput.length,
            avgWeeklyThroughput: Math.round(avgThroughput * 100) / 100,
          },
          forecast: {
            "50th_percentile": {
              weeks: p50,
              date: addWeeks(p50),
              description: "50% chance of finishing by this date",
            },
            "85th_percentile": {
              weeks: p85,
              date: addWeeks(p85),
              description: "85% chance of finishing by this date",
            },
            "95th_percentile": {
              weeks: p95,
              date: addWeeks(p95),
              description: "95% chance of finishing by this date",
            },
          },
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error running forecast: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
