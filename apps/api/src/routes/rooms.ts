import { Router, Request, Response } from "express";
import { prisma } from "@shinaa/database";
import { AvailabilityQuerySchema, AvailabilityQueryInput } from "@shinaa/shared-types";
import { authenticateJWT, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/rooms/availability - Public availability search
router.get("/availability", async (req: Request, res: Response) => {
  // 1. Establish defaults if query params are missing
  const now = new Date();
  
  // Format current date as YYYY-MM-DD
  const defaultDate = now.toISOString().split("T")[0];
  
  // Format current time as HH:MM
  const startH = String(now.getHours()).padStart(2, "0");
  const startM = String(now.getMinutes()).padStart(2, "0");
  const defaultStartTime = `${startH}:${startM}`;
  
  // Default end time is start time + 1 hour (wrapped at 24)
  const endH = String((now.getHours() + 1) % 24).padStart(2, "0");
  const defaultEndTime = `${endH}:${startM}`;

  const queryParams = {
    date: req.query.date as string || defaultDate,
    startTime: req.query.startTime as string || defaultStartTime,
    endTime: req.query.endTime as string || defaultEndTime,
  };

  // 2. Validate query params using the shared Zod schema
  const validation = AvailabilityQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.flatten().fieldErrors });
  }

  const { date, startTime, endTime } = validation.data as Required<AvailabilityQueryInput>;

  try {
    // 3. Extract the day of the week (1 = Monday, 7 = Sunday)
    // We parse in UTC or local depending on date string. A date string like YYYY-MM-DD 
    // parsed directly as `new Date("YYYY-MM-DD")` yields UTC, which can shift the day.
    // To prevent timezone shifts, we split the string and parse it as a local date.
    const [year, month, day] = date.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    const jsDay = localDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // 4. Fetch all rooms including their keys and active schedules
    // To prevent pulling too much data, we can query only schedules that match our date/dayOfWeek criteria
    const rooms = await prisma.room.findMany({
      include: {
        keys: {
          select: {
            id: true,
            lastUpdated: true,
            keyLogs: {
              where: {
                timeIn: null,
              },
              select: {
                studentName: true,
                studentId: true,
                phoneNumber: true,
              },
            },
          },
        },
        schedules: {
          where: {
            OR: [
              {
                scheduleType: "recurring_class",
                dayOfWeek: dayOfWeek,
              },
              {
                scheduleType: "one_time_event",
                specificDate: localDate,
              },
            ],
          },
        },
      },
    });

    // 5. Evaluate availability and conflict prediction for each room
    const result = rooms.map((room) => {
      const roomKey = room.keys[0] || null;
      const activeLog = roomKey?.keyLogs?.[0] || null;
      const isKeyAvailable = roomKey ? roomKey.keyLogs.length === 0 : false;
      
      // Check for time intersections among the room's schedules for this day
      // Conflict formula: Requested_Start_Time < Existing_End_Time AND Requested_End_Time > Existing_Start_Time
      const conflictSchedule = room.schedules.find((schedule) => {
        return startTime < schedule.endTime && endTime > schedule.startTime;
      });

      const isOccupied = !!conflictSchedule;

      return {
        id: room.id,
        name: room.name,
        roomType: room.roomType,
        key: roomKey ? {
          id: roomKey.id,
          isAvailable: isKeyAvailable,
          lastUpdated: roomKey.lastUpdated,
          activeLog: activeLog,
        } : null,
        isKeyAvailable,
        prediction: {
          status: isOccupied ? "Occupied" : "Vacant",
          reason: conflictSchedule ? conflictSchedule.title : null,
          scheduleType: conflictSchedule ? conflictSchedule.scheduleType : null,
          queriedSlot: {
            date,
            startTime,
            endTime,
          },
        },
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Availability prediction query error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// GET /api/rooms/:id/peek - Peek upcoming schedules for a room
router.get("/:id/peek", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const now = new Date();
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const todayStr = now.toISOString().split("T")[0];
    const [year, month, day] = todayStr.split("-").map(Number);
    const localToday = new Date(year, month - 1, day);

    const currentH = String(now.getHours()).padStart(2, "0");
    const currentM = String(now.getMinutes()).padStart(2, "0");
    const currentTimeString = `${currentH}:${currentM}`;

    const schedules = await prisma.schedule.findMany({
      where: {
        roomId: id,
        OR: [
          {
            scheduleType: "recurring_class",
            dayOfWeek,
          },
          {
            scheduleType: "one_time_event",
            specificDate: localToday,
          },
        ],
      },
    });

    const upcomingSchedules = schedules
      .filter((s) => s.endTime > currentTimeString)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 3);

    return res.json(upcomingSchedules);
  } catch (error) {
    console.error("Peek room schedules error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// GET /api/rooms - List all rooms with keys
router.get("/", async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        keys: {
          select: {
            id: true,
            keyLogs: {
              where: { timeIn: null },
              select: {
                id: true,
                studentName: true,
                studentId: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    return res.json(rooms);
  } catch (error) {
    console.error("List rooms error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// POST /api/rooms - Add a new room (Requires official)
router.post("/", authenticateJWT, requireRole(["official"]), async (req: AuthenticatedRequest, res: Response) => {
  const { name, roomType } = req.body;

  if (!name || !roomType) {
    return res.status(400).json({ error: "Room name and roomType are required" });
  }

  try {
    const existingRoom = await prisma.room.findUnique({
      where: { name },
    });

    if (existingRoom) {
      return res.status(400).json({ error: "Room with this name already exists" });
    }

    const room = await prisma.room.create({
      data: {
        name,
        roomType,
      },
    });

    // Automatically create the associated Key
    const key = await prisma.key.create({
      data: {
        roomId: room.id,
      },
    });

    return res.status(201).json({ room, key });
  } catch (error) {
    console.error("Create room error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// PATCH /api/rooms/:id - Edit room name (Requires official)
router.patch("/:id", authenticateJWT, requireRole(["official"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Room name is required" });
  }

  try {
    const existingRoom = await prisma.room.findUnique({
      where: { name },
    });

    if (existingRoom && existingRoom.id !== id) {
      return res.status(400).json({ error: "Room name is already taken by another room" });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        name,
      },
    });

    return res.json(updatedRoom);
  } catch (error) {
    console.error("Update room error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// DELETE /api/rooms/:id - Delete a room (Requires official)
router.delete("/:id", authenticateJWT, requireRole(["official"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.room.delete({
      where: { id },
    });

    return res.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Delete room error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

export default router;
