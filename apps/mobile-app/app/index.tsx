import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../src/config";

interface Room {
  id: string;
  name: string;
  roomType: string;
  isKeyAvailable: boolean;
  prediction: {
    status: "Occupied" | "Vacant";
    reason: string | null;
    queriedSlot: {
      date: string;
      startTime: string;
      endTime: string;
    };
  };
}

export default function StudentLedger() {
  const router = useRouter();
  
  // Real-time status state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search parameters state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchRooms = async (searchParams?: { date: string; startTime: string; endTime: string }) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/api/rooms/availability`;
      if (searchParams) {
        const { date, startTime, endTime } = searchParams;
        if (date && startTime && endTime) {
          url += `?date=${encodeURIComponent(date)}&startTime=${encodeURIComponent(
            startTime
          )}&endTime=${encodeURIComponent(endTime)}`;
        }
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load campus status");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network error. Please verify backend API status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Set default search parameters based on current local date/time
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const hourStr = String(now.getHours()).padStart(2, "0");
    const nextHourStr = String((now.getHours() + 1) % 24).padStart(2, "0");
    const minStr = String(now.getMinutes()).padStart(2, "0");

    setDate(dateStr);
    setStartTime(`${hourStr}:${minStr}`);
    setEndTime(`${nextHourStr}:${minStr}`);

    fetchRooms();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Reset search indicator and reload defaults
    setIsSearching(false);
    fetchRooms();
  };

  const handleSearch = () => {
    if (!date || !startTime || !endTime) {
      alert("Please enter date, start time, and end time to search.");
      return;
    }
    // Simple formats checks
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert("Date must be in YYYY-MM-DD format.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      alert("Times must be in HH:MM format.");
      return;
    }

    setIsSearching(true);
    fetchRooms({ date, startTime, endTime });
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header toolbar with hidden login redirect */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Campus Key Locker</Text>
          <TouchableOpacity onPress={() => router.push("/login")} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Staff Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Prediction Search Panel */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Vacancy Prediction Search</Text>
          <Text style={styles.cardSubheader}>
            Search schedules to check if rooms will be occupied or open.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="e.g. 2026-06-15"
              style={styles.input}
              placeholderTextColor="#656D76"
            />
          </View>

          <View style={styles.timeRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Time (HH:MM)</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="e.g. 08:30"
                style={styles.input}
                placeholderTextColor="#656D76"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>End Time (HH:MM)</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="e.g. 10:00"
                style={styles.input}
                placeholderTextColor="#656D76"
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search Vacancy</Text>
          </TouchableOpacity>
        </View>

        {/* Status display headers */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {isSearching ? "Prediction Results" : "Real-Time Ledger Status"}
          </Text>
          {isSearching && (
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.resetText}>Show Live Status</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing && (
          <ActivityIndicator size="small" color="#0969DA" style={styles.spinner} />
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Room list layout */}
        {!loading && rooms.map((room) => {
          const isAvailable = room.isKeyAvailable;
          const predictedFree = room.prediction.status === "Vacant";

          return (
            <View key={room.id} style={styles.roomRow}>
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomType}>{room.roomType}</Text>
              </View>

              {/* Status details based on searched vs live status */}
              <View style={styles.statusCol}>
                {isSearching ? (
                  <View style={styles.statusGroup}>
                    <Text style={styles.badgeLabel}>Locker Status:</Text>
                    <View
                      style={[
                        styles.badge,
                        isAvailable ? styles.badgeAvailable : styles.badgeTaken,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isAvailable ? styles.badgeTextAvailable : styles.badgeTextTaken,
                        ]}
                      >
                        {isAvailable ? "In Locker" : "Checked Out"}
                      </Text>
                    </View>

                    <Text style={[styles.badgeLabel, { marginTop: 4 }]}>Timetable Status:</Text>
                    <View
                      style={[
                        styles.badge,
                        predictedFree ? styles.badgeAvailable : styles.badgeTaken,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          predictedFree ? styles.badgeTextAvailable : styles.badgeTextTaken,
                        ]}
                      >
                        {predictedFree ? "Predicted Vacant" : "Predicted Occupied"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.badge,
                      isAvailable ? styles.badgeAvailable : styles.badgeTaken,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isAvailable ? styles.badgeTextAvailable : styles.badgeTextTaken,
                      ]}
                    >
                      {isAvailable ? "In Locker" : "Checked Out"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2328",
  },
  loginBtn: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  loginBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#24292F",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2328",
  },
  cardSubheader: {
    fontSize: 12,
    color: "#656D76",
    marginTop: 2,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2328",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1F2328",
    backgroundColor: "#FFFFFF",
  },
  timeRow: {
    flexDirection: "row",
  },
  searchButton: {
    backgroundColor: "#0969DA",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2328",
  },
  resetText: {
    fontSize: 12,
    color: "#0969DA",
    textDecorationLine: "underline",
  },
  spinner: {
    marginVertical: 20,
  },
  errorText: {
    color: "#CF222E",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 10,
  },
  roomRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2328",
  },
  roomType: {
    fontSize: 11,
    color: "#656D76",
    textTransform: "capitalize",
    marginTop: 2,
  },
  statusCol: {
    alignItems: "flex-end",
  },
  statusGroup: {
    alignItems: "flex-end",
  },
  badgeLabel: {
    fontSize: 9,
    color: "#656D76",
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeAvailable: {
    backgroundColor: "#DDF4E4",
  },
  badgeTaken: {
    backgroundColor: "#FFEBE9",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  badgeTextAvailable: {
    color: "#1F883D",
  },
  badgeTextTaken: {
    color: "#CF222E",
  },
});
