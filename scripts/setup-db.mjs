import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL이 필요합니다.");
const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean)) await sql.query(statement);
console.log("Database ready");

