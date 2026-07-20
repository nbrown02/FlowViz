import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable } from "../table-map.js";

export const cycleTimeInputSchema = z.object({
  percentile: z
    .number()
    .min(10)
    .max(100)
    .optional()
    .describe(
      "The percentile to return (e.g. 50, 85). Defaults to returning both 50th and 85th."
    ),
  days: z
    .number()
    .optional()
    .describe("Number of days to look back. Defaults to all available data."),
  workItemType: z
    .string()
    .optional()
    .describe("Filter by work item type (e.g. 'User Story', 'Bug', 'Story', 'Task')."),
});

export function registerCycleTimeTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "get_cycle_time",
    {
      title: "Get cycle time",
      description:
        "Get cycle time metrics from your FlowViz dataset. " +
        "Returns percentiles (50th, 85th), average, and max cycle time. " +
        "Optionally filter by date range and work item type.",
      inputSchema: cycleTimeInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const table = getTable("cycleTime", sourceType);
        const measures = buildMeasureList(args.percentile);
        const filterClauses = buildFilters(args.days, args.workItemType, sourceType);

        const dax = filterClauses
          ? `EVALUATE CALCULATETABLE(${measures}, ${filterClauses})`
          : `EVALUATE ${measures}`;

        const result = await client.executeDax(dax);
        const rows = result.tables?.[0]?.rows ?? [];

        if (rows.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No cycle time data found for the given filters.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(rows[0], null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying cycle time: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function buildMeasureList(percentile?: number): string {
  if (percentile) {
    const pName = formatPercentileName(percentile);
    return `ROW("CycleTime_${percentile}th", [${pName}])`;
  }

  // Default: return a useful set
  return (
    `ROW(` +
    `"CT_50th", [CT50th], ` +
    `"CT_85th", [CT85th], ` +
    `"Average_Cycle_Time", [Average Cycle Time], ` +
    `"Max_Cycle_Time", [MAXCT]` +
    `)`
  );
}

function formatPercentileName(p: number): string {
  if (p === 50) return "CT50th";
  if (p === 85) return "CT85th";

  // Handle ordinal suffixes for the individual percentile measures
  const suffix = getOrdinalSuffix(p);
  return `CT${p}${suffix}`;
}

function getOrdinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function buildFilters(
  days?: number,
  workItemType?: string,
  sourceType?: SourceType
): string | null {
  const parts: string[] = [];

  if (days) {
    parts.push(
      `DATESINPERIOD(Dates[Date], TODAY(), -${days}, DAY)`
    );
  }

  if (workItemType) {
    // ADO uses WorkItemType column on the fact table,
    // Jira uses IssueType
    const typeCol =
      sourceType === "jira" ? "IssueType" : "WorkItemType";
    parts.push(
      `FILTER(ALL('${getTable("cycleTime", sourceType ?? "ado")}'[${typeCol}]), '${getTable("cycleTime", sourceType ?? "ado")}'[${typeCol}] = "${workItemType}")`
    );
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
