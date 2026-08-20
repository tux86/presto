import { Hono } from "hono";
import * as repo from "../../db/repo.ts";
import type { Env } from "../app.ts";
import { assertUnused, required } from "../errors.ts";
import { clientInput, clientPatch, companyInput, companyPatch, missionInput, missionPatch } from "../schemas.ts";

/**
 * CRUD for the three reference entities. They share a shape, so they share a
 * file; the differences are the schema, the repo functions and the dependents
 * that block a delete.
 */
export const entities = new Hono<Env>()

  // ── Companies ──────────────────────────────────────────────────────────────
  .get("/companies", (c) => c.json(repo.listCompanies(c.var.db)))

  .post("/companies", async (c) => {
    const input = companyInput.parse(await c.req.json());
    return c.json(repo.createCompany(c.var.db, input), 201);
  })

  .patch("/companies/:id", async (c) => {
    const id = c.req.param("id");
    required(repo.getCompany(c.var.db, id), "Company");
    const patch = companyPatch.parse(await c.req.json());
    return c.json(repo.updateCompany(c.var.db, id, patch));
  })

  .delete("/companies/:id", (c) => {
    const id = c.req.param("id");
    required(repo.getCompany(c.var.db, id), "Company");
    assertUnused("missions", repo.countMissionsForCompany(c.var.db, id));
    repo.deleteCompany(c.var.db, id);
    return c.body(null, 204);
  })

  // ── Clients ────────────────────────────────────────────────────────────────
  .get("/clients", (c) => c.json(repo.listClients(c.var.db)))

  .post("/clients", async (c) => {
    const input = clientInput.parse(await c.req.json());
    return c.json(repo.createClient(c.var.db, input), 201);
  })

  .patch("/clients/:id", async (c) => {
    const id = c.req.param("id");
    required(repo.getClient(c.var.db, id), "Client");
    const patch = clientPatch.parse(await c.req.json());
    return c.json(repo.updateClient(c.var.db, id, patch));
  })

  .delete("/clients/:id", (c) => {
    const id = c.req.param("id");
    required(repo.getClient(c.var.db, id), "Client");
    assertUnused("missions", repo.countMissionsForClient(c.var.db, id));
    repo.deleteClient(c.var.db, id);
    return c.body(null, 204);
  })

  // ── Missions ───────────────────────────────────────────────────────────────
  .get("/missions", (c) => c.json(repo.listMissions(c.var.db)))

  .post("/missions", async (c) => {
    const input = missionInput.parse(await c.req.json());
    required(repo.getClient(c.var.db, input.clientId), "Client");
    required(repo.getCompany(c.var.db, input.companyId), "Company");
    return c.json(repo.createMission(c.var.db, input), 201);
  })

  .patch("/missions/:id", async (c) => {
    const id = c.req.param("id");
    required(repo.getMission(c.var.db, id), "Mission");
    const patch = missionPatch.parse(await c.req.json());
    if (patch.clientId) required(repo.getClient(c.var.db, patch.clientId), "Client");
    if (patch.companyId) required(repo.getCompany(c.var.db, patch.companyId), "Company");
    return c.json(repo.updateMission(c.var.db, id, patch));
  })

  .delete("/missions/:id", (c) => {
    const id = c.req.param("id");
    required(repo.getMission(c.var.db, id), "Mission");
    assertUnused("reports", repo.countReportsForMission(c.var.db, id));
    repo.deleteMission(c.var.db, id);
    return c.body(null, 204);
  });
