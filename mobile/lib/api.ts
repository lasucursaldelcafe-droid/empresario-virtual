const DEFAULT_API =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

let apiBaseUrl = DEFAULT_API;

export function getApiUrl(): string {
  return apiBaseUrl.replace(/\/$/, "");
}

export function setApiUrl(url: string): void {
  apiBaseUrl = url.replace(/\/$/, "");
}

export interface DailyCloseResult {
  date: string;
  executiveSummary: string;
  emailSent?: boolean;
  kpis: {
    sales: number;
    expenses: number;
    profit: number;
    profitChangePercent?: number;
  };
  topAlerts: Array<{
    severity: string;
    message: string;
    agentId: string;
  }>;
  agentResults: Array<{
    agentId: string;
    summary: string;
    status: string;
  }>;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiUrl()}/api/health`, {
      method: "GET",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runDailyClose(sendEmail = false): Promise<DailyCloseResult> {
  const res = await fetch(`${getApiUrl()}/api/daily-close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sendEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
  }

  return res.json();
}

export async function fetchAgents(): Promise<
  Array<{ id: string; name: string; role: string }>
> {
  const res = await fetch(`${getApiUrl()}/api/agents`);
  if (!res.ok) throw new Error("No se pudo cargar agentes");
  const data = await res.json();
  return data.agents;
}
