import {
  PublicClientApplication,
  type DeviceCodeRequest,
  type AuthenticationResult,
} from "@azure/msal-node";
import type { FlowVizConfig } from "./config.js";

const POWER_BI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

export interface DaxResult {
  tables: Array<{
    rows: Array<Record<string, unknown>>;
  }>;
}

export class PowerBIClient {
  private msalApp: PublicClientApplication;
  private cachedToken: AuthenticationResult | null = null;
  private config: FlowVizConfig;

  constructor(config: FlowVizConfig) {
    this.config = config;
    this.msalApp = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });
  }

  /**
   * Acquire a token, using cached/refresh token if available,
   * falling back to device code flow for interactive login.
   */
  async getToken(): Promise<string> {
    // Try silent acquisition first (cached or refresh token)
    if (this.cachedToken) {
      try {
        const accounts = await this.msalApp.getTokenCache().getAllAccounts();
        if (accounts.length > 0) {
          const result = await this.msalApp.acquireTokenSilent({
            account: accounts[0],
            scopes: [POWER_BI_SCOPE],
          });
          if (result) {
            this.cachedToken = result;
            return result.accessToken;
          }
        }
      } catch {
        // Silent failed, fall through to device code
      }
    }

    // Device code flow - user authenticates in browser
    const request: DeviceCodeRequest = {
      scopes: [POWER_BI_SCOPE],
      deviceCodeCallback: (response) => {
        // This message is shown to the user via stderr so it
        // doesn't interfere with MCP stdio transport on stdout
        console.error(`\n${response.message}\n`);
      },
    };

    const result = await this.msalApp.acquireTokenByDeviceCode(request);
    if (!result) {
      throw new Error("Device code authentication failed");
    }
    this.cachedToken = result;
    return result.accessToken;
  }

  /**
   * Execute a DAX query against the configured Power BI dataset.
   */
  async executeDax(dax: string): Promise<DaxResult> {
    const token = await this.getToken();
    const url =
      `https://api.powerbi.com/v1.0/myorg/groups/` +
      `${this.config.workspaceId}/datasets/` +
      `${this.config.datasetId}/executeQueries`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: [{ query: dax }],
        serializerSettings: { includeNulls: true },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Power BI API error ${response.status}: ${body}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `DAX query error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    return data.results?.[0] ?? { tables: [] };
  }
}
