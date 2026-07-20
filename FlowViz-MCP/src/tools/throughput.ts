import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable } from "../table-map.js";

export const throughputInputSchema = z.object({
  days: z
    .number()
    .optional()
    .describe("Number of days to look back. Defaults to all available data."),
  workItemType: z
    .string()
    .optional()
    .describe("Filter by work item type (e.g. 'User Story', 'Bug', 'Story', 'Task')."),
  weekly: z
    .boolean()
    .optional()
    .describe("If true, returns weekly throughput breakdown instead of a single total."),
});

export function registerThroughputTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "get_throughput",
    {
      title: "Get throughput",
      description:
        "Get throughput metrics from your FlowViz dataset. " +
        "Returns the count of completed items, bug rate, and percentage change. " +
        "Optionally filter by date range and work item type. " +
        "Set weekly=true for a week-by-week breakdown.",
      inputSchema: throughputInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const table = getTable("throughput", sourceType);
        const typeCol = sourceType === "jira" ? "IssueType" : "WorkItemType";

        let dax: string;

        if (args.weekly) {
          const filters = buildFilterClause(args.days, args.workItemType, table, typeCol);
          dax =
            `EVALUATE ` +
            `SUMMARIZE(` +
            `${filters ? `CALCULATETABLE('${table}', ${filters})` : `'${table}'`}, ` +
            `Dates[WeekStartingDate], ` +
            `"Completed", [CompletedItems2], ` +
            `"Bug_Rate", [Bug Rate]` +
            `)`;
        } else {
          const measures =
            `ROW(` +
            `"Completed_Items", [CompletedItems2], ` +
            `"Bug_Rate", [Bug Rate], ` +
            `"Completed_Change_Pct", [CompletedItems_PercentChange], ` +
            `"Bug_Rate_Change_Pct", [BugRate_PercentChange]` +
            `)`;

          const filters = buildFilterClause(args.days, args.workItemType, table, typeCol);
          dax = filters
            ? `EVALUATE CALCULATETABLE(${measures}, ${filters})`
            : `EVALUATE ${measures}`;
        }

        const result = await client.executeDax(dax);
        const rows = result.tables?.[0]?.rows ?? [];

        if (rows.length === 0) {
          return {
            content: [{ type: "text", text: "No throughput data found for the given filters." }],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying throughput: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function buildFilterClause(
  days: number | undefined,
  workItemType: string | undefined,
  table: string,
  typeCol: string
): string | null {
  const parts: string[] = [];
  if (days) {
    parts.push(`DATESINPERIOD(Dates[Date], TODAY(), -${days}, DAY)`);
  }
  if (workItemType) {
    parts.push(
      `FILTER(ALL('${table}'[${typeCol}]), '${table}'[${typeCol}] = "${workItemType}")`
    );
  }
  return parts.length > 0 ? parts.join(", ") : null;
}
