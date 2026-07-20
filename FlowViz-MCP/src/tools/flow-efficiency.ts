import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable, getMeasureName } from "../table-map.js";

export const flowEfficiencyInputSchema = z.object({
  days: z
    .number()
    .optional()
    .describe("Number of days to look back. Defaults to all available data."),
  workItemType: z
    .string()
    .optional()
    .describe("Filter by work item type (e.g. 'User Story', 'Bug', 'Story', 'Task')."),
  includeTimeInColumn: z
    .boolean()
    .optional()
    .describe(
      "If true, also returns time spent in each workflow column/status. Defaults to false."
    ),
});

export function registerFlowEfficiencyTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "get_flow_efficiency",
    {
      title: "Get flow efficiency",
      description:
        "Get flow efficiency metrics from your FlowViz dataset. " +
        "Flow efficiency is the ratio of active working time to total time (including wait states). " +
        "Optionally includes a breakdown of time spent in each workflow column/status.",
      inputSchema: flowEfficiencyInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const table = getTable("flowEfficiency", sourceType);
        const typeCol = sourceType === "jira" ? "IssueType" : "WorkItemType";
        const feMeasure = getMeasureName("flowEfficiency", sourceType);

        const filterParts: string[] = [];
        if (args.days) {
          filterParts.push(
            `DATESINPERIOD(Dates[Date], TODAY(), -${args.days}, DAY)`
          );
        }
        if (args.workItemType) {
          filterParts.push(
            `FILTER(ALL('${table}'[${typeCol}]), '${table}'[${typeCol}] = "${args.workItemType}")`
          );
        }
        const filterClause =
          filterParts.length > 0 ? filterParts.join(", ") : null;

        // Flow efficiency summary
        const feDax = filterClause
          ? `EVALUATE CALCULATETABLE(ROW("Flow_Efficiency", [${feMeasure}]), ${filterClause})`
          : `EVALUATE ROW("Flow_Efficiency", [${feMeasure}])`;

        const feResult = await client.executeDax(feDax);
        const feRows = feResult.tables?.[0]?.rows ?? [];

        const output: Record<string, unknown> = {
          flowEfficiency: feRows[0] ?? {},
        };

        // Time in column breakdown
        if (args.includeTimeInColumn) {
          const ticMeasure = getMeasureName("timeInColumn", sourceType);
          const colNameField =
            sourceType === "jira"
              ? `'${table}'[From]`
              : `'${table}'[Column]`;

          const ticDax =
            `EVALUATE ` +
            `SUMMARIZE(` +
            `${filterClause ? `CALCULATETABLE('${table}', ${filterClause})` : `'${table}'`}, ` +
            `${colNameField}, ` +
            `"Time_In_Column_Days", [${ticMeasure}]` +
            `)`;

          const ticResult = await client.executeDax(ticDax);
          output.timeInColumn = ticResult.tables?.[0]?.rows ?? [];
        }

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying flow efficiency: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
