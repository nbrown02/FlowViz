# FlowViz MCP Server

Query your FlowViz flow metrics directly from Claude (or any MCP-compatible client) by chatting in natural language. This MCP server connects to your published FlowViz Power BI dataset and returns the same numbers you see in your dashboards.

For the Jira version, see [FlowViz-Jira](https://github.com/nbrown02/FlowViz-Jira).

## What can you ask?

- "What's our cycle time 85th percentile for the last 90 days?"
- "Show me weekly throughput for the last quarter"
- "Which items in progress are at risk of exceeding our cycle time?"
- "What's our flow efficiency?"
- "Are any items currently blocked?"
- "If we have 30 items left, when will we finish?"

## Available tools

| Tool | Description |
|------|-------------|
| `get_cycle_time` | Cycle time percentiles (50th, 85th, or any), average, and max |
| `get_throughput` | Completed item counts, bug rate, weekly breakdowns |
| `get_wip` | Average daily WIP, net flow (started vs completed) |
| `get_aging` | Work item age, probability of exceeding 85th percentile cycle time |
| `get_flow_efficiency` | Ratio of active time to total time, time in column breakdown |
| `get_blocked` | Blocked item counts, days lost, currently blocked items |
| `run_forecast` | Monte Carlo simulation for delivery date forecasting |

## Prerequisites

- Your FlowViz report is **published to the Power BI Service** (not just open locally in Power BI Desktop)
- [Node.js](https://nodejs.org/) version 18 or later installed on your machine

## Setup

### 1. Find your Power BI workspace ID and dataset ID

Open your published FlowViz report in the Power BI Service at app.powerbi.com. Look at the URL in your browser:

```
https://app.powerbi.com/groups/WORKSPACE_ID/reports/...
```

Copy the value after `/groups/` -- that is your **workspace ID**.

Then navigate to the dataset for your FlowViz report (Settings > Datasets or click the dataset name). The URL will contain:

```
https://app.powerbi.com/groups/WORKSPACE_ID/datasets/DATASET_ID/...
```

Copy the **dataset ID**.

### 2. Find your tenant ID

Go to https://portal.azure.com, search for "Microsoft Entra ID" (or "Azure Active Directory"), and click on it. Your **Tenant ID** is shown on the Overview page.

### 3. Create the config file

Create a folder and config file on your machine:

**Windows:**
```
mkdir %USERPROFILE%\.flowviz-mcp
```
Then create the file `%USERPROFILE%\.flowviz-mcp\config.json`

**Mac/Linux:**
```bash
mkdir -p ~/.flowviz-mcp
```
Then create the file `~/.flowviz-mcp/config.json`

Paste this into the file, replacing the placeholder values with your own:

```json
{
  "sourceType": "ado",
  "workspaceId": "your-workspace-id-here",
  "datasetId": "your-dataset-id-here",
  "tenantId": "your-tenant-id-here",
  "clientId": "eb55ace0-b1c9-4a23-a4ec-676a241c0a16"
}
```

The `clientId` is always `eb55ace0-b1c9-4a23-a4ec-676a241c0a16` -- this is the same for everyone.

### 4. Build the MCP server

From the root of this repository:

```bash
cd FlowViz-MCP
npm install
npm run build
```

### 5. Add to Claude Desktop

Open your Claude Desktop settings and find the MCP configuration file (`claude_desktop_config.json`). Add the following, replacing the path with where you cloned/downloaded this repo:

**Windows:**
```json
{
  "mcpServers": {
    "flowviz": {
      "command": "node",
      "args": ["C:\\path\\to\\FlowViz\\FlowViz-MCP\\dist\\index.js"]
    }
  }
}
```

**Mac/Linux:**
```json
{
  "mcpServers": {
    "flowviz": {
      "command": "node",
      "args": ["/path/to/FlowViz/FlowViz-MCP/dist/index.js"]
    }
  }
}
```

### 6. Authenticate

The first time the server runs, it will prompt you to open a browser and sign in with your Microsoft account (the same one you use to access your Power BI workspace):

```
To sign in, use a web browser to open https://microsoft.com/devicelogin
and enter the code XXXXXXX to authenticate.
```

This only happens once. After that, your login is cached locally on your machine.

## Privacy

This server runs entirely on your local machine. Your data never leaves your network. No data passes through any third-party server.

## License

MIT
