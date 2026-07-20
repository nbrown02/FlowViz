import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable, getMeasureName } from "../table-map.js";

export const wipInputSchema = z.object({
  days: z
    .number()
    .optional()
    .describe("Number of days to look back. Defaults to all available data."),
  includeNetFlow: z
    .boolean()
    .optional()
    .describe("If true, also returns net flow (started minus completed). Defaults to true."),
});

export function registerWipTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "get_wip",
    {
      title: "Get WIP",
      description:
        "Get work in progress metrics from your FlowViz dataset. " +
        "Returns average daily WIP, WIP trend, and optionally net flow " +
        "(items started minus items completed). " +
        "Optionally filter by date range.",
      inputSchema: wipInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const wipTable = getTable("wip", sourceType);
        const includeNetFlow = args.includeNetFlow !== false;

        const measureParts = [
          `"Average_Daily_WIP", [AverageDailyWIP]`,
          `"WIP_Change_Pct", [AverageDailyWIP_PercentChange]`,
        ];

        // WIP summary query
        const wipMeasures = `ROW(${measureParts.join(", ")})`;
        const wipFilter = args.days
          ? `EVALUATE CALCULATETABLE(${wipMeasures}, DATESINPERIOD(Dates[Date], TODAY(), -${args.days}, DAY))`
          : `EVALUATE ${wipMeasures}`;

        const wipResult = await client.executeDax(wipFilter);
        const wipRows = wipResult.tables?.[0]?.rows ?? [];

        let netFlowRows: Array<Record<string, unknown>> = [];

        if (includeNetFlow) {
          const ipTable = getTable("wipInProgress", sourceType);
          const netFlowMeasure = getMeasureName("netFlow", sourceType);
          const startedMeasure = getMeasureName("started", sourceType);
          const completedMeasure = getMeasureName("completed", sourceType);

          const netFlowDax = args.days
            ? `EVALUATE CALCULATETABLE(ROW("Net_Flow", [${netFlowMeasure}], "Started", [${startedMeasure}], "Completed", [${completedMeasure}]), DATESINPERIOD(Dates[Date], TODAY(), -${args.days}, DAY))`
            : `EVALUATE ROW("Net_Flow", [${netFlowMeasure}], "Started", [${startedMeasure}], "Completed", [${completedMeasure}])`;

          const netFlowResult = await client.executeDax(netFlowDax);
          netFlowRows = netFlowResult.tables?.[0]?.rows ?? [];
        }

        const combined = {
          wip: wipRows[0] ?? {},
          ...(includeNetFlow && netFlowRows[0] ? { netFlow: netFlowRows[0] } : {}),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(combined, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying WIP: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
