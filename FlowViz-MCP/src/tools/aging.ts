import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PowerBIClient } from "../powerbi.js";
import type { SourceType } from "../config.js";
import { getTable } from "../table-map.js";

export const agingInputSchema = z.object({
  workItemType: z
    .string()
    .optional()
    .describe("Filter by work item type (e.g. 'User Story', 'Bug', 'Story', 'Task')."),
  onlyAtRisk: z
    .boolean()
    .optional()
    .describe(
      "If true, only returns items whose age exceeds the 85th percentile cycle time. " +
      "Defaults to false (returns all in-progress items)."
    ),
});

export function registerAgingTool(
  server: McpServer,
  client: PowerBIClient,
  sourceType: SourceType
) {
  server.registerTool(
    "get_aging",
    {
      title: "Get work item aging",
      description:
        "Get aging information for in-progress work items. " +
        "Shows how long each item has been in progress and its probability " +
        "of exceeding the 85th percentile cycle time. " +
        "Use onlyAtRisk=true to see just the items that are aging beyond expectations.",
      inputSchema: agingInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const table = getTable("aging", sourceType);
        const typeCol = sourceType === "jira" ? "IssueType" : "WorkItemType";
        const titleCol = "Title";
        const daysCol = sourceType === "jira" ? "DaysInProgress" : "DaysInProgress";

        // Get summary measures
        const summaryDax =
          `EVALUATE ROW(` +
          `"Total_In_Progress", [DaysInProgress2], ` +
          `"Total_Age_Days", [TotalAge]` +
          `)`;

        const summaryResult = await client.executeDax(summaryDax);
        const summary = summaryResult.tables?.[0]?.rows?.[0] ?? {};

        // Get individual item details
        const filterParts: string[] = [];
        if (args.workItemType) {
          filterParts.push(
            `'${table}'[${typeCol}] = "${args.workItemType}"`
          );
        }
        if (args.onlyAtRisk) {
          filterParts.push(`[ProbabilityExceedingCT85th] > 0.5`);
        }

        const filterClause =
          filterParts.length > 0
            ? `, FILTER('${table}', ${filterParts.join(" && ")})`
            : "";

        const itemsDax =
          `EVALUATE ` +
          `TOPN(25, ` +
          `ADDCOLUMNS(` +
          `'${table}'${filterClause}, ` +
          `"Age_Days", '${table}'[${daysCol}], ` +
          `"Prob_Exceeding_CT85", [ProbabilityExceedingCT85th]` +
          `), ` +
          `'${table}'[${daysCol}], DESC` +
          `)`;

        const itemsResult = await client.executeDax(itemsDax);
        const items = itemsResult.tables?.[0]?.rows ?? [];

        const output = {
          summary,
          items: items.map((row) => ({
            title: row[`${table}[${titleCol}]`] ?? row["Title"] ?? "Unknown",
            type: row[`${table}[${typeCol}]`] ?? row[typeCol] ?? "",
            daysInProgress: row["Age_Days"] ?? row[daysCol],
            probabilityExceedingCT85:
              row["Prob_Exceeding_CT85"] ?? null,
          })),
        };

        if (output.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: args.onlyAtRisk
                  ? "No at-risk items found. All in-progress work is within expected cycle time range."
                  : "No in-progress items found.",
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying aging: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
