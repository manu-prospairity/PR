import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import type { User } from '@db/schema';

const scryptAsync = promisify(scrypt);

// Rate limiting configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced password hashing
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(32).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export function setupAuth(app: Express) {
  // Session store setup
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: app.get("env") === "production",
      sameSite: "lax"
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
      stale: false
    }),
    name: 'sessionId', // Custom session cookie name
  };

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Trust first proxy
  app.set("trust proxy", 1);
  
  // Session and passport initialization
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy setup
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return done(null, false, { message: "Invalid credentials" });
      }

      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Invalid credentials" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // User serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // User deserialization with error handling
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!user) {
        return done(new Error('User not found'));
      }
      
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues
        });
      }

      const { username, password } = result.data;
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long"
        });
      }

      // Check for existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create new user
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
        })
        .returning();

      // Log in new user
      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // Login endpoint with rate limiting
  app.post("/api/login", loginLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          message: info?.message || "Login failed",
        });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Only return necessary user data
        return res.json({
          message: "Login successful",
          user: { 
            id: user.id, 
            username: user.username 
          }
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Session destruction failed" });
        }
        res.clearCookie('sessionId');
        res.json({ message: "Logout successful" });
      });
    });
  });

  // User info endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Only return necessary user data
    res.json({ 
      id: req.user.id, 
      username: req.user.username 
    });
  });
}

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
