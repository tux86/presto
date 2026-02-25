import app from "../src/app.js";

export const state: Record<string, string> = {
  token: "",
  token2: "",
  userId: "",
  clientId: "",
  clientId2: "",
  bobClientId: "",
  companyId: "",
  companyId2: "",
  bobCompanyId: "",
  missionId: "",
  missionId2: "",
  bobMissionId: "",
  reportId: "",
  reportIdTemp: "",
  bobReportId: "",
  entryId: "",
  entryId2: "",
};

export async function api(method: string, path: string, opts?: { body?: unknown; token?: string }) {
  const headers: Record<string, string> = {};
  const token = opts?.token ?? state.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";
  return app.request(`/api${path}`, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}
