import { bootstrapDatabase } from "../lib/db/bootstrap";

const { sqlite } = bootstrapDatabase();
sqlite.close();