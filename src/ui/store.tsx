import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from "react";
import type { Client, Company, HolidayLookup, Mission, Report } from "../core/types.ts";
import { type AppState, api } from "./api.ts";

type Status = "loading" | "ready" | "error";

interface Store extends AppState {
  status: Status;
  reload: () => Promise<void>;

  /** Look-ups the pages need constantly. */
  client: (id: string) => Client | undefined;
  company: (id: string) => Company | undefined;
  mission: (id: string) => Mission | undefined;
  /** Holiday lookup for a country, from the dates the server sent. */
  holidaysFor: (country: string) => HolidayLookup;
  /** Whether the shipped calendars cover a year. */
  coversHolidayYear: (year: number) => boolean;

  upsertCompany: (company: Company) => void;
  removeCompany: (id: string) => void;
  upsertClient: (client: Client) => void;
  removeClient: (id: string) => void;
  upsertMission: (mission: Mission) => void;
  removeMission: (id: string) => void;
  upsertReport: (report: Report) => void;
  removeReport: (id: string) => void;
}

const EMPTY: AppState = {
  app: { name: "Presto", version: "" },
  countries: [],
  companies: [],
  clients: [],
  missions: [],
  reports: [],
  holidays: {},
  holidayYears: [],
};

const StoreContext = createContext<Store | null>(null);

/** Replace by id, or append when it is new. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

/**
 * The whole dataset lives here.
 *
 * A single freelancer's data is tens of kilobytes, so it is loaded once and
 * kept in memory. Mutations patch this state with what the server returned —
 * there is no cache to invalidate and no refetch on every navigation.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(async () => {
    setStatus("loading");
    try {
      setState(await api.state());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Store>(() => {
    const patch = <K extends "companies" | "clients" | "missions" | "reports">(
      key: K,
      fn: (list: AppState[K]) => AppState[K],
    ) => setState((s) => ({ ...s, [key]: fn(s[key]) }));

    return {
      ...state,
      status,
      reload,
      client: (id) => state.clients.find((c) => c.id === id),
      coversHolidayYear: (year) => state.holidayYears.includes(year),
      holidaysFor: (country) => {
        const dates = new Set(state.holidays[country] ?? []);
        // The dashboard shades holidays but never names them, so "" is enough
        // to mark one — the editor gets real names with the report detail.
        return (iso) => (dates.has(iso) ? "" : null);
      },
      company: (id) => state.companies.find((c) => c.id === id),
      mission: (id) => state.missions.find((m) => m.id === id),

      // A company becoming the default un-defaults the others server-side, so
      // mirror that here rather than refetching the list.
      upsertCompany: (company) =>
        patch("companies", (list) =>
          upsert(company.isDefault ? list.map((c) => ({ ...c, isDefault: false })) : list, company),
        ),
      removeCompany: (id) => patch("companies", (list) => list.filter((c) => c.id !== id)),
      upsertClient: (client) => patch("clients", (list) => upsert(list, client)),
      removeClient: (id) => patch("clients", (list) => list.filter((c) => c.id !== id)),
      upsertMission: (mission) => patch("missions", (list) => upsert(list, mission)),
      removeMission: (id) => patch("missions", (list) => list.filter((m) => m.id !== id)),
      upsertReport: (report) => patch("reports", (list) => upsert(list, report)),
      removeReport: (id) => patch("reports", (list) => list.filter((r) => r.id !== id)),
    };
  }, [state, status, reload]);

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): Store {
  const value = use(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
