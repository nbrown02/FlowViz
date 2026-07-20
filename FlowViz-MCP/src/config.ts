import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type SourceType = "ado" | "jira";

export interface FlowVizConfig {
  sourceType: SourceType;
  workspaceId: string;
  datasetId: string;
  tenantId: string;
  clientId: string;
}

const CONFIG_DIR = join(homedir(), ".flowviz-mcp");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function loadConfig(): FlowVizConfig {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config file not found at ${CONFIG_PATH}\n\n` +
        `Create it with the following structure:\n` +
        JSON.stringify(
          {
            sourceType: "ado | jira",
            workspaceId: "your-power-bi-workspace-id",
            datasetId: "your-power-bi-dataset-id",
            tenantId: "your-azure-tenant-id",
            clientId: "flowviz-entra-app-client-id",
          },
          null,
          2
        )
    );
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  const required = [
    "sourceType",
    "workspaceId",
    "datasetId",
    "tenantId",
    "clientId",
  ];
  for (const key of required) {
    if (!parsed[key]) {
      throw new Error(`Missing required config field: ${key}`);
    }
  }

  if (parsed.sourceType !== "ado" && parsed.sourceType !== "jira") {
    throw new Error(`sourceType must be "ado" or "jira", got "${parsed.sourceType}"`);
  }

  return parsed as FlowVizConfig;
}
