import { db } from "./db";
import { players } from "./schema";
import { eq } from "drizzle-orm";

export class PlayerRepository {
  static create(id: string, name: string, email: string) {
    db.insert(players).values({ id, name, email }).run();
  }

  static getById(id: string) {
    return db.select().from(players).where(eq(players.id, id)).get();
  }

  static getByEmail(email: string) {
    return db.select().from(players).where(eq(players.email, email)).get();
  }

  static list() {
    return db.select().from(players).all();
  }

  static delete(id: string) {
    db.delete(players).where(eq(players.id, id)).run();
  }
}
