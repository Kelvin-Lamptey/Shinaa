import { z } from "zod";

// Room Validation
export const RoomTypeEnum = z.enum(["classroom", "auditorium", "laboratory", "office", "other"]);
export type RoomType = z.infer<typeof RoomTypeEnum>;

export const CreateRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(100),
  roomType: RoomTypeEnum,
});
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

// Key Checkout Validation
export const KeyCheckoutSchema = z.object({
  studentName: z.string().min(2, "Student name must be at least 2 characters").max(100),
  studentId: z.string().min(3, "Student ID must be at least 3 characters").max(50),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$|^[0-9]{7,15}$/, "Invalid phone number format"),
});
export type KeyCheckoutInput = z.infer<typeof KeyCheckoutSchema>;

// Schedule Type
export const ScheduleTypeEnum = z.enum(["recurring_class", "one_time_event"]);
export type ScheduleType = z.infer<typeof ScheduleTypeEnum>;

// Timetable CSV Row Validation
export const TimetableRowSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  title: z.string().min(1, "Title is required"),
  scheduleType: ScheduleTypeEnum,
  dayOfWeek: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(1).max(7).optional()
  ),
  specificDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : String(val)),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional()
  ),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
}).refine(
  (data) => {
    if (data.scheduleType === "recurring_class") {
      return data.dayOfWeek !== undefined;
    }
    if (data.scheduleType === "one_time_event") {
      return data.specificDate !== undefined;
    }
    return true;
  },
  {
    message: "recurring_class requires dayOfWeek, and one_time_event requires specificDate",
    path: ["scheduleType"],
  }
).refine(
  (data) => {
    const [startH, startM] = data.startTime.split(":").map(Number);
    const [endH, endM] = data.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return startMinutes < endMinutes;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);
export type TimetableRowInput = z.infer<typeof TimetableRowSchema>;

// One-Time Event Creation Validation
export const CreateEventSchema = z.object({
  roomId: z.string().uuid("Invalid Room ID"),
  title: z.string().min(1, "Event title is required").max(200),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
}).refine(
  (data) => {
    const [startH, startM] = data.startTime.split(":").map(Number);
    const [endH, endM] = data.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return startMinutes < endMinutes;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

// Public Availability Query Validation
export const AvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format").optional(),
}).refine(
  (data) => {
    // If either time is provided, both must be provided
    if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
      return false;
    }
    return true;
  },
  {
    message: "Both startTime and endTime must be provided together",
    path: ["startTime"],
  }
).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      return (startH * 60 + startM) < (endH * 60 + endM);
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);
export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>;

// Staff User Roles
export const StaffRoleEnum = z.enum(["official", "caretaker", "super_admin"]);
export type StaffRole = z.infer<typeof StaffRoleEnum>;
