import { useState, useEffect, DragEvent, ChangeEvent, FormEvent } from "react";
import {
  School,
  Calendar,
  CalendarDays,
  UploadCloud,
  Download,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";

interface OfficialWorkspaceProps {
  token: string;
}

interface Room {
  id: string;
  name: string;
  roomType: string;
  keys?: Array<{
    id: string;
    keyLogs?: Array<{
      id: string;
      studentName: string;
      studentId: string;
      phoneNumber: string;
    }>;
  }>;
}

interface Schedule {
  id: string;
  roomId: string;
  title: string;
  scheduleType: "recurring_class" | "one_time_event";
  dayOfWeek?: number; // 1 = Mon, 7 = Sun
  specificDate?: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  room?: {
    name: string;
    roomType: string;
  };
}

export default function OfficialWorkspace({ token }: OfficialWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"rooms" | "timetables" | "events" | "calendar">("rooms");

  // Shared state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab A: Lecture Halls state
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("classroom");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Tab B: Timetables upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; errors: Record<string, string[]> }>>([]);

  // Tab C: One-Off Events state
  const [eventRoomId, setEventRoomId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventFormStatus, setEventFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [eventFormMessage, setEventFormMessage] = useState("");

  // Tab D: Calendar navigation state
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [showTimetables, setShowTimetables] = useState(false);
  const [showEvents, setShowEvents] = useState(true);

  // Pagination states
  const [roomPage, setRoomPage] = useState(1);
  const roomsPerPage = 8;

  const [timetablePage, setTimetablePage] = useState(1);
  const timetablesPerPage = 8;

  // Helper date formatters
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDayName = (dayIndex: number) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days[dayIndex - 1] || "";
  };

  // API calls
  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (err) {
      console.error("Error loading rooms:", err);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/schedules", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error("Error loading schedules:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchRooms(), fetchSchedules()]);
    } catch (err) {
      setError("Failed to synchronize workspace data with the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Tab A: Lecture Halls CRUD actions
  const handleAddRoom = async (e: FormEvent) => {
    e.preventDefault();
    setRoomFormError(null);
    if (!newRoomName || !newRoomType) {
      setRoomFormError("All fields are required");
      return;
    }

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          roomType: newRoomType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add room");
      }

      setNewRoomName("");
      setNewRoomType("classroom");
      await loadData();
    } catch (err: any) {
      setRoomFormError(err.message || "An error occurred.");
    }
  };

  const handleStartEditing = (room: Room) => {
    setEditingRoomId(room.id);
    setEditingRoomName(room.name);
  };

  const handleCancelEditing = () => {
    setEditingRoomId(null);
    setEditingRoomName("");
  };

  const handleSaveRoomName = async (roomId: string) => {
    if (!editingRoomName.trim()) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingRoomName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update room name");
      }

      setEditingRoomId(null);
      setEditingRoomName("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error updating room name");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room? This will also delete all associated keys and schedules.")) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete room");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Error deleting room");
    }
  };

  // Tab B: Timetable operations
  const downloadSampleCSV = () => {
    const csvContent = "room_name,title,day_of_week,start_time,end_time\nA-101,Advanced Mathematics,Monday,09:00,11:00\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadCSV = async (file: File) => {
    setUploadStatus("uploading");
    setUploadErrors([]);
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/schedules/upload-csv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadStatus("error");
        setUploadMessage(data.error || "Failed to upload CSV file");
        if (data.details) {
          setUploadErrors(data.details);
        }
      } else {
        setUploadStatus("success");
        setUploadMessage(data.message || "CSV schedule uploaded successfully!");
        await loadData();
      }
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage("Network error during file upload. Please verify backend API.");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        uploadCSV(file);
      } else {
        setUploadStatus("error");
        setUploadMessage("Invalid file format. Please drop a valid .csv file.");
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadCSV(e.target.files[0]);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to cancel and delete this schedule?")) return;

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete schedule");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Error deleting schedule");
    }
  };

  // Tab C: One-Off Event operations
  const handleEventSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEventFormStatus("loading");
    setEventFormMessage("");

    if (!eventRoomId || !eventTitle || !eventDate || !eventStartTime || !eventEndTime) {
      setEventFormStatus("error");
      setEventFormMessage("All event fields are required");
      return;
    }

    try {
      const response = await fetch("/api/schedules/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: eventRoomId,
          title: eventTitle,
          specificDate: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEventFormStatus("error");
        if (data.errors) {
          const firstErrField = Object.keys(data.errors)[0];
          setEventFormMessage(`${firstErrField}: ${data.errors[firstErrField][0]}`);
        } else {
          setEventFormMessage(data.error || "Failed to book event");
        }
      } else {
        setEventFormStatus("success");
        setEventFormMessage(data.message || "One-time event logged successfully!");
        setEventTitle("");
        setEventDate("");
        setEventStartTime("");
        setEventEndTime("");
        setEventRoomId("");
        await loadData();
      }
    } catch (err) {
      setEventFormStatus("error");
      setEventFormMessage("Network error occurred. Please verify backend API.");
    }
  };

  // Filtered schedules for calendar and list views
  const recurringTimetables = schedules.filter((s) => s.scheduleType === "recurring_class");
  const oneOffEvents = schedules.filter((s) => s.scheduleType === "one_time_event");

  // Pagination filters
  const indexLastRoom = roomPage * roomsPerPage;
  const indexFirstRoom = indexLastRoom - roomsPerPage;
  const currentRooms = rooms.slice(indexFirstRoom, indexLastRoom);

  const indexLastTimetable = timetablePage * timetablesPerPage;
  const indexFirstTimetable = indexLastTimetable - timetablesPerPage;
  const currentTimetables = recurringTimetables.slice(indexFirstTimetable, indexLastTimetable);

  // Tab D: Master Calendar helpers
  const handleCalendarNav = (direction: "prev" | "next" | "today") => {
    const newRef = new Date(referenceDate);
    if (direction === "today") {
      setReferenceDate(new Date());
    } else if (calendarView === "week") {
      newRef.setDate(referenceDate.getDate() + (direction === "prev" ? -7 : 7));
      setReferenceDate(newRef);
    } else {
      newRef.setMonth(referenceDate.getMonth() + (direction === "prev" ? -1 : 1));
      setReferenceDate(newRef);
    }
  };

  const getWeekDays = (date: Date) => {
    const result = [];
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
    const startOfWeek = new Date(current.setDate(diff));
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      result.push(d);
    }
    return result;
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonthDays = [];
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align to Mon
    for (let i = offset - 1; i >= 0; i--) {
      prevMonthDays.push(new Date(year, month - 1, daysInPrevMonth - i));
    }

    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push(new Date(year, month, i));
    }

    const nextMonthDays = [];
    const totalSlots = 42;
    const remaining = totalSlots - (prevMonthDays.length + currentMonthDays.length);
    for (let i = 1; i <= remaining; i++) {
      nextMonthDays.push(new Date(year, month + 1, i));
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const getSchedulesForDate = (date: Date) => {
    const jsDay = date.getDay();
    const dayOfWeekIndex = jsDay === 0 ? 7 : jsDay;
    const dateStr = formatLocalDate(date);

    return schedules.filter((s) => {
      if (s.scheduleType === "recurring_class") {
        return showTimetables && s.dayOfWeek === dayOfWeekIndex;
      } else {
        return showEvents && s.specificDate && s.specificDate.substring(0, 10) === dateStr;
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white border border-[#D0D7DE] rounded-md p-4 flex flex-col gap-1 shadow-sm h-fit">
        <div className="px-3 py-2 text-xs font-semibold text-[#656D76] uppercase tracking-wider">
          Official Workspaces
        </div>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left cursor-pointer ${
            activeTab === "rooms"
              ? "bg-[#0969DA] text-white"
              : "text-[#24292F] hover:bg-[#F3F4F6]"
          }`}
        >
          <School size={16} />
          Lecture Halls
        </button>
        <button
          onClick={() => setActiveTab("timetables")}
          className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left cursor-pointer ${
            activeTab === "timetables"
              ? "bg-[#0969DA] text-white"
              : "text-[#24292F] hover:bg-[#F3F4F6]"
          }`}
        >
          <CalendarDays size={16} />
          Timetables
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left cursor-pointer ${
            activeTab === "events"
              ? "bg-[#0969DA] text-white"
              : "text-[#24292F] hover:bg-[#F3F4F6]"
          }`}
        >
          <Clock size={16} />
          One-Off Events
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left cursor-pointer ${
            activeTab === "calendar"
              ? "bg-[#0969DA] text-white"
              : "text-[#24292F] hover:bg-[#F3F4F6]"
          }`}
        >
          <Calendar size={16} />
          Master Calendar
        </button>
      </aside>

      {/* Main Workspace Panels */}
      <div className="flex-1 flex flex-col gap-6">
        {loading && (
          <div className="bg-white border border-[#D0D7DE] rounded-md p-4 text-center text-sm text-[#656D76]">
            Syncing database records...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm font-medium">
            {error}
          </div>
        )}

        {/* Tab A: Lecture Halls Panel */}
        {activeTab === "rooms" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rooms list */}
            <div className="lg:col-span-2 bg-white border border-[#D0D7DE] rounded-md shadow-sm flex flex-col">
              <div className="p-4 border-b border-[#D0D7DE] bg-[#F6F8FA] rounded-t-md flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-base text-[#1F2328]">Lecture Halls & Keys</h3>
                  <p className="text-xs text-[#656D76]">Create, rename, or delete classrooms and physical keys.</p>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold text-xs">
                      <th className="px-4 py-3">Room Name</th>
                      <th className="px-4 py-3">Room Type</th>
                      <th className="px-4 py-3">Key ID</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
                    {rooms.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-[#656D76]">
                          No lecture halls registered.
                        </td>
                      </tr>
                    )}

                    {currentRooms.map((room) => {
                      const isEditing = editingRoomId === room.id;
                      const keyId = room.keys?.[0]?.id || "None";

                      return (
                        <tr key={room.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            {isEditing ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={editingRoomName}
                                  onChange={(e) => setEditingRoomName(e.target.value)}
                                  className="border border-[#D0D7DE] rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-[#0969DA] bg-white outline-none w-32 font-semibold"
                                />
                                <button
                                  onClick={() => handleSaveRoomName(room.id)}
                                  className="bg-[#1F883D] text-white px-2 py-1 rounded text-xs hover:bg-[#1A7F37] cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEditing}
                                  className="bg-white border border-[#D0D7DE] text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="font-semibold">{room.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#656D76] capitalize">
                            {room.roomType}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[#656D76]">
                            {keyId}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              {!isEditing && (
                                <button
                                  onClick={() => handleStartEditing(room)}
                                  className="text-[#656D76] hover:text-[#0969DA] p-1 cursor-pointer transition-colors"
                                  title="Rename Room"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="text-[#656D76] hover:text-red-600 p-1 cursor-pointer transition-colors"
                                title="Delete Room"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {rooms.length > roomsPerPage && (
                <div className="p-3 border-t border-[#D0D7DE] bg-[#F6F8FA] flex justify-between items-center rounded-b-md text-xs">
                  <span className="text-[#656D76]">
                    Showing {indexFirstRoom + 1}-{Math.min(indexLastRoom, rooms.length)} of {rooms.length} rooms
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRoomPage((p) => Math.max(p - 1, 1))}
                      disabled={roomPage === 1}
                      className="border border-[#D0D7DE] bg-white px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setRoomPage((p) => Math.min(p + 1, Math.ceil(rooms.length / roomsPerPage)))}
                      disabled={roomPage >= Math.ceil(rooms.length / roomsPerPage)}
                      className="border border-[#D0D7DE] bg-white px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Create Room Form */}
            <div className="bg-white border border-[#D0D7DE] rounded-md p-5 shadow-sm h-fit">
              <h3 className="font-semibold text-base text-[#1F2328] mb-1">Add Lecture Hall</h3>
              <p className="text-xs text-[#656D76] mb-4">Introduce a new space to the campus system. A key will be auto-generated.</p>

              <form onSubmit={handleAddRoom} className="flex flex-col gap-4">
                {roomFormError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs font-medium">
                    {roomFormError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="room-name" className="text-xs font-semibold text-[#1F2328]">
                    Room Name / Number
                  </label>
                  <input
                    id="room-name"
                    type="text"
                    required
                    placeholder="e.g. C-302, Lab 4"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="room-type" className="text-xs font-semibold text-[#1F2328]">
                    Room Type Classification
                  </label>
                  <select
                    id="room-type"
                    required
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="border border-[#D0D7DE] bg-white rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
                  >
                    <option value="classroom">Classroom / Lecture Hall</option>
                    <option value="laboratory">Laboratory / Computer Lab</option>
                    <option value="auditorium">Auditorium / Large Hall</option>
                    <option value="seminar_room">Seminar Room</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-[#1F883D] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#1A7F37] transition-colors w-full cursor-pointer mt-1"
                >
                  Create Room & Key
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab B: Timetables Panel */}
        {activeTab === "timetables" && (
          <div className="flex flex-col gap-6">
            {/* Upload Zone & Guide */}
            <div className="bg-white border border-[#D0D7DE] rounded-md p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-2 border-b border-[#D0D7DE]">
                <div>
                  <h3 className="font-semibold text-lg text-[#1F2328]">Bulk Timetable Scheduling</h3>
                  <p className="text-xs text-[#656D76] mt-0.5">Upload a CSV configuration file to define weekly class timetables.</p>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  className="bg-[#F6F8FA] border border-[#D0D7DE] text-[#24292F] px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#F3F4F6] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download size={13} />
                  Download Sample.csv
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-md p-8 text-center flex flex-col items-center justify-center min-h-[160px] transition-colors cursor-pointer ${
                  dragActive ? "border-[#0969DA] bg-blue-50/20" : "border-[#D0D7DE] hover:bg-[#F6F8FA]/50"
                }`}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                  <UploadCloud className="w-8 h-8 text-[#656D76] mb-2" />
                  <span className="text-sm font-semibold text-[#1F2328]">
                    Drag & drop your CSV timetable here, or <span className="text-[#0969DA] underline">browse files</span>
                  </span>
                  <span className="text-xs text-[#656D76] mt-1.5">
                    Columns: room_name, title, day_of_week, start_time, end_time
                  </span>
                </label>
              </div>

              {/* CSV Upload Status */}
              {uploadStatus === "uploading" && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm">
                  Parsing and importing timetables...
                </div>
              )}

              {uploadStatus === "success" && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                  {uploadMessage}
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
                    {uploadMessage}
                  </div>

                  {uploadErrors.length > 0 && (
                    <div className="border border-[#D0D7DE] rounded-md overflow-hidden max-h-[180px] overflow-y-auto bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold">
                          <tr>
                            <th className="px-3 py-1.5 w-16">Row</th>
                            <th className="px-3 py-1.5">Formatting Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
                          {uploadErrors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-3 py-1.5 font-semibold">{err.row}</td>
                              <td className="px-3 py-1.5 font-mono">
                                {Object.keys(err.errors).map((field) => (
                                  <div key={field}>
                                    <span className="font-semibold capitalize">{field}:</span>{" "}
                                    {err.errors[field].join(", ")}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List Active Timetables */}
            <div className="bg-white border border-[#D0D7DE] rounded-md shadow-sm">
              <div className="p-4 border-b border-[#D0D7DE] bg-[#F6F8FA] rounded-t-md">
                <h3 className="font-semibold text-base text-[#1F2328]">Active Weekly Timetables</h3>
                <p className="text-xs text-[#656D76]">List of all recurring classes on the campus calendar.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold text-xs">
                      <th className="px-4 py-3">Lecture Room</th>
                      <th className="px-4 py-3">Class/Timetable Title</th>
                      <th className="px-4 py-3">Weekday</th>
                      <th className="px-4 py-3">Time Slot</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
                    {recurringTimetables.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-[#656D76]">
                          No recurring class timetables found.
                        </td>
                      </tr>
                    )}

                    {currentTimetables.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold">{t.room?.name || "Unknown Room"}</td>
                        <td className="px-4 py-3">{t.title}</td>
                        <td className="px-4 py-3 text-xs text-[#656D76]">
                          {t.dayOfWeek ? getDayName(t.dayOfWeek) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#656D76]">
                          {t.startTime} - {t.endTime}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteSchedule(t.id)}
                            className="text-[#656D76] hover:text-red-600 p-1 cursor-pointer transition-colors"
                            title="Delete Timetable"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {recurringTimetables.length > timetablesPerPage && (
                <div className="p-3 border-t border-[#D0D7DE] bg-[#F6F8FA] flex justify-between items-center rounded-b-md text-xs">
                  <span className="text-[#656D76]">
                    Showing {indexFirstTimetable + 1}-{Math.min(indexLastTimetable, recurringTimetables.length)} of {recurringTimetables.length} timetables
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTimetablePage((p) => Math.max(p - 1, 1))}
                      disabled={timetablePage === 1}
                      className="border border-[#D0D7DE] bg-white px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setTimetablePage((p) => Math.min(p + 1, Math.ceil(recurringTimetables.length / timetablesPerPage)))}
                      disabled={timetablePage >= Math.ceil(recurringTimetables.length / timetablesPerPage)}
                      className="border border-[#D0D7DE] bg-white px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab C: One-Off Events Panel */}
        {activeTab === "events" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Events List */}
            <div className="lg:col-span-2 bg-white border border-[#D0D7DE] rounded-md shadow-sm">
              <div className="p-4 border-b border-[#D0D7DE] bg-[#F6F8FA] rounded-t-md">
                <h3 className="font-semibold text-base text-[#1F2328]">One-Off Events Schedule</h3>
                <p className="text-xs text-[#656D76]">Upcoming guest lectures, seminars, hackathons, and single bookings.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold text-xs">
                      <th className="px-4 py-3">Lecture Room</th>
                      <th className="px-4 py-3">Event Title</th>
                      <th className="px-4 py-3">Scheduled Date</th>
                      <th className="px-4 py-3">Time Slot</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
                    {oneOffEvents.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-[#656D76]">
                          No one-off events booked.
                        </td>
                      </tr>
                    )}

                    {oneOffEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold">{ev.room?.name || "Unknown Room"}</td>
                        <td className="px-4 py-3">{ev.title}</td>
                        <td className="px-4 py-3 text-xs text-[#656D76]">
                          {ev.specificDate ? ev.specificDate.substring(0, 10) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#656D76]">
                          {ev.startTime} - {ev.endTime}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteSchedule(ev.id)}
                            className="text-[#656D76] hover:text-red-600 p-1 cursor-pointer transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Event Form */}
            <div className="bg-white border border-[#D0D7DE] rounded-md p-5 shadow-sm h-fit">
              <h3 className="font-semibold text-base text-[#1F2328] mb-1">Book Single Event</h3>
              <p className="text-xs text-[#656D76] mb-4">Schedule a non-recurring event in a selected lecture hall.</p>

              <form onSubmit={handleEventSubmit} className="flex flex-col gap-4">
                {eventFormStatus === "success" && (
                  <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs">
                    {eventFormMessage}
                  </div>
                )}

                {eventFormStatus === "error" && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs font-medium">
                    {eventFormMessage}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-room-select" className="text-xs font-semibold text-[#1F2328]">
                    Target Room
                  </label>
                  <select
                    id="event-room-select"
                    required
                    value={eventRoomId}
                    onChange={(e) => setEventRoomId(e.target.value)}
                    className="border border-[#D0D7DE] bg-white rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
                  >
                    <option value="">-- Choose a room --</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.roomType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-title" className="text-xs font-semibold text-[#1F2328]">
                    Event Description / Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    required
                    placeholder="e.g. AI Seminar / Hackathon"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-date" className="text-xs font-semibold text-[#1F2328]">
                    Date
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="event-start" className="text-xs font-semibold text-[#1F2328]">
                      Start Time
                    </label>
                    <input
                      id="event-start"
                      type="text"
                      required
                      placeholder="09:00"
                      pattern="\d{2}:\d{2}"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="event-end" className="text-xs font-semibold text-[#1F2328]">
                      End Time
                    </label>
                    <input
                      id="event-end"
                      type="text"
                      required
                      placeholder="11:00"
                      pattern="\d{2}:\d{2}"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={eventFormStatus === "loading"}
                  className="bg-[#0969DA] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0353A4] transition-colors w-full cursor-pointer mt-1 disabled:opacity-50"
                >
                  {eventFormStatus === "loading" ? "Booking event..." : "Book Lecture Hall"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab D: Master Calendar Panel */}
        {activeTab === "calendar" && (
          <div className="bg-white border border-[#D0D7DE] rounded-md p-6 shadow-sm flex flex-col gap-5">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#D0D7DE]">
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-lg text-[#1F2328]">Master Campus Schedule</h3>
                <div className="flex gap-4 mt-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#24292F]">
                    <input
                      type="checkbox"
                      checked={showTimetables}
                      onChange={(e) => setShowTimetables(e.target.checked)}
                      className="rounded text-[#0969DA] border-[#D0D7DE] focus:ring-0 cursor-pointer"
                    />
                    Show Timetables
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#24292F]">
                    <input
                      type="checkbox"
                      checked={showEvents}
                      onChange={(e) => setShowEvents(e.target.checked)}
                      className="rounded text-[#0969DA] border-[#D0D7DE] focus:ring-0 cursor-pointer"
                    />
                    Show Events
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Navigation */}
                <div className="flex items-center border border-[#D0D7DE] rounded-md shadow-sm overflow-hidden bg-white">
                  <button
                    onClick={() => handleCalendarNav("prev")}
                    className="p-1.5 hover:bg-gray-50 border-r border-[#D0D7DE] text-[#24292F] cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleCalendarNav("today")}
                    className="px-3 py-1 text-xs font-semibold hover:bg-gray-50 text-[#24292F] cursor-pointer border-r border-[#D0D7DE]"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleCalendarNav("next")}
                    className="p-1.5 hover:bg-gray-50 text-[#24292F] cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="text-sm font-semibold text-[#1F2328]">
                  {calendarView === "week"
                    ? `Week of ${getWeekDays(referenceDate)[0].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                    : referenceDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </div>

                {/* View switcher */}
                <div className="flex border border-[#D0D7DE] rounded-md overflow-hidden bg-[#F6F8FA] p-0.5 text-xs font-medium">
                  <button
                    onClick={() => setCalendarView("week")}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      calendarView === "week" ? "bg-white text-[#1F2328] shadow-xs" : "text-[#656D76] hover:text-[#1F2328]"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView("month")}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      calendarView === "month" ? "bg-white text-[#1F2328] shadow-xs" : "text-[#656D76] hover:text-[#1F2328]"
                    }`}
                  >
                    Month
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid rendering */}
            {calendarView === "week" ? (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-h-[400px]">
                {getWeekDays(referenceDate).map((day, idx) => {
                  const daySchedules = getSchedulesForDate(day);
                  const isToday = formatLocalDate(new Date()) === formatLocalDate(day);

                  return (
                    <div
                      key={idx}
                      className={`border border-[#D0D7DE] rounded-md flex flex-col p-2 min-h-[220px] bg-white ${
                        isToday ? "ring-1 ring-[#0969DA] bg-blue-50/5" : ""
                      }`}
                    >
                      <div className="text-center border-b border-[#D0D7DE] pb-1.5 mb-2">
                        <span className={`text-xs font-semibold block uppercase tracking-wider ${isToday ? "text-[#0969DA]" : "text-[#656D76]"}`}>
                          {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                        <span className={`text-sm font-bold block ${isToday ? "text-[#0969DA]" : "text-[#1F2328]"}`}>
                          {day.getDate()}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[300px]">
                        {daySchedules.length === 0 && (
                          <div className="text-center py-6 text-[11px] text-[#656D76] italic">Vacant</div>
                        )}

                        {daySchedules.map((s) => (
                          <div
                            key={s.id}
                            className={`p-1.5 border rounded-md text-[11px] flex flex-col gap-0.5 shadow-2xs ${
                              s.scheduleType === "recurring_class"
                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                : "bg-green-50 border-green-200 text-green-800"
                            }`}
                          >
                            <span className="font-semibold truncate" title={s.title}>
                              {s.title}
                            </span>
                            <span className="font-medium font-mono text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                              {s.startTime}-{s.endTime}
                            </span>
                            <span className="text-[10px] text-gray-500 font-semibold uppercase truncate">
                              🏢 {s.room?.name || "Room"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Monthly view
              <div className="flex flex-col border border-[#D0D7DE] rounded-md overflow-hidden bg-[#F6F8FA]">
                {/* Mon-Sun header row */}
                <div className="grid grid-cols-7 border-b border-[#D0D7DE] text-center font-semibold text-xs text-[#656D76] bg-[#F6F8FA] py-2">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                {/* Day boxes */}
                <div className="grid grid-cols-7 grid-rows-6 gap-[1px] bg-[#D0D7DE]">
                  {getMonthDays(referenceDate).map((day, idx) => {
                    const daySchedules = getSchedulesForDate(day);
                    const isCurrentMonth = day.getMonth() === referenceDate.getMonth();
                    const isToday = formatLocalDate(new Date()) === formatLocalDate(day);

                    return (
                      <div
                        key={idx}
                        className={`bg-white min-h-[75px] p-1 flex flex-col gap-1 ${
                          !isCurrentMonth ? "bg-gray-50/70" : ""
                        } ${isToday ? "ring-1 ring-[#0969DA] z-10" : ""}`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold px-1">
                          <span className={isToday ? "text-[#0969DA] font-extrabold" : !isCurrentMonth ? "text-[#D0D7DE]" : "text-[#656D76]"}>
                            {day.getDate()}
                          </span>
                          {daySchedules.length > 0 && (
                            <span className="text-[8px] bg-gray-100 text-gray-600 px-1 rounded-full border border-gray-200">
                              {daySchedules.length}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                          {daySchedules.slice(0, 2).map((s) => (
                            <div
                              key={s.id}
                              className={`px-1 py-0.5 rounded text-[8px] truncate leading-tight font-semibold border ${
                                s.scheduleType === "recurring_class"
                                  ? "bg-blue-50 border-blue-100 text-blue-800"
                                  : "bg-green-50 border-green-100 text-green-800"
                              }`}
                              title={`${s.startTime} - ${s.endTime} | ${s.title}`}
                            >
                              {s.startTime} {s.title}
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-[8px] text-[#656D76] font-medium text-center italic">
                              + {daySchedules.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
