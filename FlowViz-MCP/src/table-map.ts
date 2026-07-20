import type { SourceType } from "./config.js";

/**
 * Maps a logical metric group to the Power BI table name
 * that contains the relevant measures, for each source type.
 */
const TABLE_MAP: Record<string, Record<SourceType, string>> = {
  cycleTime: {
    ado: "WorkItems Completed",
    jira: "WorkItems History",
  },
  throughput: {
    ado: "WorkItems Completed",
    jira: "WorkItems Completed",
  },
  wip: {
    ado: "WorkItems WIPLimit",
    jira: "WorkItems WIP 3",
  },
  wipInProgress: {
    ado: "WorkItems In Progress",
    jira: "WorkItems History3",
  },
  aging: {
    ado: "WorkItems In Progress2",
    jira: "WorkItems InProgress",
  },
  flowEfficiency: {
    ado: "WorkItems FlowEfficiency",
    jira: "WorkItems History2",
  },
  blocked: {
    ado: "WorkItems Blocked2",
    jira: "WorkItems History4",
  },
  blockedItems: {
    ado: "WorkItems Blocked2",
    jira: "WorkItems History5",
  },
};

/**
 * Maps measure names that differ between ADO and Jira.
 * If a measure name is the same in both, it won't appear here.
 */
const MEASURE_ALIASES: Record<string, Record<SourceType, string>> = {
  flowEfficiency: {
    ado: "FE",
    jira: "FlowEfficiency (per issue)",
  },
  timeInColumn: {
    ado: "Time in column (days)",
    jira: "TimeInColumnDays",
  },
  wipCount: {
    ado: "WIPItems2",
    jira: "Count2",
  },
  netFlow: {
    ado: "NetFlow",
    jira: "NetFlow",
  },
  started: {
    ado: "Started",
    jira: "Started1",
  },
  completed: {
    ado: "Completed",
    jira: "Completed1",
  },
  blockedItems: {
    ado: "Bl0ckedItems2",
    jira: "BlockedItems2",
  },
  blockedDays: {
    ado: "NumberofBlockedDays4",
    jira: "NumberofBlockedDays3",
  },
  blockerFrequency: {
    ado: "BlockerFrequency",
    jira: "BlockedItems_PercentChange",
  },
};

export function getTable(group: string, source: SourceType): string {
  const entry = TABLE_MAP[group];
  if (!entry) throw new Error(`Unknown metric group: ${group}`);
  return entry[source];
}

export function getMeasureName(
  alias: string,
  source: SourceType
): string {
  const entry = MEASURE_ALIASES[alias];
  if (!entry) return alias; // same name in both
  return entry[source];
}
