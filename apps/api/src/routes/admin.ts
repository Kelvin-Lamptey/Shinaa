import { Router, Response } from "express";
import { prisma } from "@shinaa/database";
import * as bcrypt from "bcrypt";
import { authenticateJWT, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// Apply super admin authentication to all admin routes
router.use(authenticateJWT);
router.use(requireRole(["super_admin"]));

// GET /api/admin/staff - List all staff users (excluding passwords)
router.get("/staff", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = await prisma.staffUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return res.json(staff);
  } catch (error) {
    console.error("List staff error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// POST /api/admin/staff - Create a new official or caretaker staff user
router.post("/staff", async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, role, password } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: "All fields (name, email, role, password) are required" });
  }

  if (role !== "official" && role !== "caretaker") {
    return res.status(400).json({ error: "Role must be either 'official' or 'caretaker'" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Check if email is already registered
    const existingUser = await prisma.staffUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A staff user with this email already exists" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.staffUser.create({
      data: {
        name,
        email,
        role,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(201).json({
      message: "Staff user created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Create staff error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

export default router;
