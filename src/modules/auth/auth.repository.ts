import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { profiles } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";

export class AuthRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async findByUsername(username: string) {
    return this.db.select().from(profiles).where(eq(profiles.username, username)).get();
  }

  async findById(id: string) {
    return this.db.select().from(profiles).where(eq(profiles.id, id)).get();
  }

  async createUser(id: string, username: string, hashedPassword: string) {
    this.db.insert(profiles).values({
      id,
      username,
      password: hashedPassword,
    }).run();

    return this.findById(id);
  }
}
