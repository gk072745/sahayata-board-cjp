import { Router } from "express";
import { loginOrRegister, AuthError } from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  if (username.length < 3 || password.length < 4) {
    return res
      .status(400)
      .json({ error: "Username must be 3+ characters and password 4+ characters." });
  }
  try {
    const result = await loginOrRegister(username.trim(), password);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    next(err);
  }
});
