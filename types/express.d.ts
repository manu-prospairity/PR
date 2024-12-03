import { User as DbUser } from "@db/schema";

declare global {
  namespace Express {
    interface User extends DbUser {
      id: number;
      username: string;
    }
  }
}

export {}; 