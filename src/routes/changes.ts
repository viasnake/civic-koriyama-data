import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { jsonResponse } from "../constants";
import type { Bindings } from "../types";

export const changeRoutes = new Hono<{ Bindings: Bindings }>();

changeRoutes.get("/", zValidator("query", z.object({ since: z.string().optional() })), async (c) => {
  const { since } = c.req.valid("query");
  const statement = since
    ? c.env.DB.prepare("select * from record_changes where changed_at >= ? order by changed_at desc limit 100").bind(since)
    : c.env.DB.prepare("select * from record_changes order by changed_at desc limit 100");
  const result = await statement.all();
  return jsonResponse(result.results);
});
