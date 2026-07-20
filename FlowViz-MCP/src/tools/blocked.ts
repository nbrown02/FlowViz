import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable, getMeasureName } from "../table-map.js";

export const blockedInputSchema = z.object({
  days: z
    .number()
    .optional()
    .describe("Number of days to look back. Defaults to all available data."),
  currentlyBlocked: z
    .boolean()
    .optional()
    .describe(
      "If true, returns only items currently blocked right now. " +
      "If false/omitted, returns historical blocked metrics."
    ),
});

export function registerBlockedTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "get_blocked",
    {
      title: "Get blocked items",
      description:
        "Get blocked work item metrics from your FlowViz dataset. " +
        "Returns the number of blocked items, total days lost to blockers, " +
        "blocker frequency, and mean time to unblock (MTTU). " +
        "Set currentlyBlocked=true to see items blocked right now.",
      inputSchema: blockedInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        if (args.currentlyBlocked) {
          return await getCurrentlyBlocked(client, sourceType);
        }

        return await getBlockedMetrics(client, sourceType, args.days);
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying blocked items: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

async function getBlockedMetrics(
  client: PowerBIClient,
  sourceType: SourceType,
  days?: number
): Promise<CallToolResult> {
  const table = getTable("blocked", sourceType);
  const blockedDaysMeasure = getMeasureName("blockedDays", sourceType);
  const timeDoing = sourceType === "jira" ? "TimeDoing2" : "TimeDoing2";

  const measures =
    `ROW(` +
    `"Days_Lost_To_Blockers", [${blockedDaysMeasure}], ` +
    `"Time_Doing_Days", [${timeDoing}]` +
    `)`;

  const filter = days
    ? `EVALUATE CALCULATETABLE(${measures}, DATESINPERIOD(Dates[Date], TODAY(), -${days}, DAY))`
    : `EVALUATE ${measures}`;

  const result = await client.executeDax(filter);
  const rows = result.tables?.[0]?.rows ?? [];

  // Also get blocker items count from the other table
  const itemsTable = getTable("blockedItems", sourceType);
  const blockedItemsMeasure = getMeasureName("blockedItems", sourceType);

  const itemsDax = days
    ? `EVALUATE CALCULATETABLE(ROW("Blocked_Items_Count", [${blockedItemsMeasure}]), DATESINPERIOD(Dates[Date], TODAY(), -${days}, DAY))`
    : `EVALUATE ROW("Blocked_Items_Count", [${blockedItemsMeasure}])`;

  const itemsResult = await client.executeDax(itemsDax);
  const itemsRows = itemsResult.tables?.[0]?.rows ?? [];

  const output = {
    blockedMetrics: rows[0] ?? {},
    blockedItemCount: itemsRows[0] ?? {},
  };

  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
  };
}

async function getCurrentlyBlocked(
  client: PowerBIClient,
  sourceType: SourceType
): Promise<CallToolResult> {
  // For currently blocked items, query the relevant table
  // ADO: WorkItems Blocked3 has DaysSinceLastBlocked
  // Jira: WorkItems Currently Blocked has DaysBlocked
  if (sourceType === "ado") {
    const dax =
      `EVALUATE ` +
      `TOPN(25, 'WorkItems Blocked3', 'WorkItems Blocked3'[DaysSinceLastBlocked], DESC)`;

    const result = await client.executeDax(dax);
    const rows = result.tables?.[0]?.rows ?? [];

    if (rows.length === 0) {
      return {
        content: [{ type: "text", text: "No items are currently blocked." }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  } else {
    const dax =
      `EVALUATE ` +
      `TOPN(25, 'WorkItems Currently Blocked', 'WorkItems Currently Blocked'[DaysBlocked], DESC)`;

    const result = await client.executeDax(dax);
    const rows = result.tables?.[0]?.rows ?? [];

    if (rows.length === 0) {
      return {
        content: [{ type: "text", text: "No items are currently blocked." }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
}
