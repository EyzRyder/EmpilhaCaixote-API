import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new BetterSqlite3("database.sqlite");
export const db = drizzle(sqlite, { schema });
