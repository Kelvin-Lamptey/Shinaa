import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getToken, deleteToken } from "../src/storage";
import { API_URL } from "../src/config";

interface ActiveLog {
  studentName: string;
  studentId: string;
  phoneNumber: string;
}

interface Room {
  id: string;
  name: string;
  roomType: string;
  isKeyAvailable: boolean;
  key: {
    id: string;
    isAvailable: boolean;
    lastUpdated: string;
    activeLog: ActiveLog | null;
  } | null;
}

export default function CaretakerWorkspace() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // Ledger status state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checkout modal form state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const nameInputRef = useRef<TextInput>(null);

  const checkAuthAndLoad = async () => {
    const savedToken = await getToken("shinaa_token");
    if (!savedToken) {
      router.replace("/login");
      return;
    }
    setToken(savedToken);
    fetchRooms(savedToken);
  };

  const fetchRooms = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/rooms/availability`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load room status");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error connecting to backend API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const handleRefresh = () => {
    if (token) {
      setRefreshing(true);
      fetchRooms(token);
    }
  };

  const handleSignOut = async () => {
    await deleteToken("shinaa_token");
    router.replace("/");
  };

  const openCheckout = (room: Room) => {
    if (!room.key || !room.isKeyAvailable) return;
    setSelectedRoom(room);
    setStudentName("");
    setStudentId("");
    setPhoneNumber("");
    setCheckoutError(null);

    // Auto focus name input on modal open
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedRoom?.key || !token) return;
    setCheckoutError(null);

    if (!studentName || !studentId || !phoneNumber) {
      setCheckoutError("All fields are required");
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/keys/${selectedRoom.key.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName,
          studentId,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const firstErrField = Object.keys(data.errors)[0];
          throw new Error(`${firstErrField}: ${data.errors[firstErrField][0]}`);
        }
        throw new Error(data.error || "Checkout failed");
      }

      setSelectedRoom(null);
      fetchRooms(token);
    } catch (err: any) {
      setCheckoutError(err.message || "Checkout error. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReturnKey = async (keyId: string) => {
    if (!token) return;

    Alert.alert("Confirm Return", "Mark this room key as returned?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Done",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/api/keys/${keyId}/return`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || "Failed to return key");
            }

            fetchRooms(token);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not process key return");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Caretaker Sub-Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Staff Dashboard</Text>
          <Text style={styles.headerSubtitle}>Live key checkout database ledger</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && !refreshing && (
          <ActivityIndicator size="small" color="#0969DA" style={styles.spinner} />
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && rooms.map((room) => {
          const isAvailable = room.isKeyAvailable;
          const activeLog = room.key?.activeLog;

          return (
            <View key={room.id} style={styles.roomRow}>
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomType}>{room.roomType}</Text>

                {activeLog && (
                  <View style={styles.runnerBox}>
                    <Text style={styles.runnerName}>{activeLog.studentName}</Text>
                    <Text style={styles.runnerPhone}>{activeLog.phoneNumber}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionCol}>
                {isAvailable ? (
                  <TouchableOpacity
                    onPress={() => openCheckout(room)}
                    style={styles.checkoutBtn}
                  >
                    <Text style={styles.checkoutBtnText}>Checkout</Text>
                  </TouchableOpacity>
                ) : (
                  room.key && (
                    <TouchableOpacity
                      onPress={() => handleReturnKey(room.key!.id)}
                      style={styles.returnBtn}
                    >
                      <Text style={styles.returnBtnText}>Mark Done</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Checkout Modal */}
      {selectedRoom && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedRoom(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Checkout: Room {selectedRoom.name}</Text>
                <TouchableOpacity onPress={() => setSelectedRoom(null)}>
                  <Text style={styles.closeChar}>&times;</Text>
                </TouchableOpacity>
              </View>

              {checkoutError && <Text style={styles.modalErrorText}>{checkoutError}</Text>}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Student Name</Text>
                <TextInput
                  value={studentName}
                  onChangeText={setStudentName}
                  placeholder="e.g. Jane Doe"
                  ref={nameInputRef}
                  style={styles.input}
                  placeholderTextColor="#656D76"
                  editable={!checkoutLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Student ID</Text>
                <TextInput
                  value={studentId}
                  onChangeText={setStudentId}
                  placeholder="e.g. STU98765"
                  style={styles.input}
                  placeholderTextColor="#656D76"
                  editable={!checkoutLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="e.g. +1234567890"
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#656D76"
                  editable={!checkoutLoading}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setSelectedRoom(null)}
                  disabled={checkoutLoading}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCheckoutSubmit}
                  disabled={checkoutLoading}
                  style={styles.submitBtn}
                >
                  {checkoutLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Mark Taken</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },
  headerBar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D0D7DE",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2328",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#656D76",
    marginTop: 2,
  },
  signOutBtn: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  signOutBtnText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#24292F",
  },
  container: {
    padding: 16,
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
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 80,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2328",
  },
  roomType: {
    fontSize: 11,
    color: "#656D76",
    textTransform: "capitalize",
    marginTop: 2,
  },
  runnerBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F6F8FA",
    paddingTop: 6,
  },
  runnerName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2328",
  },
  runnerPhone: {
    fontSize: 11,
    color: "#656D76",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 1,
  },
  actionCol: {
    marginLeft: 16,
    justifyContent: "center",
  },
  checkoutBtn: {
    backgroundColor: "#0969DA",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 90,
    alignItems: "center",
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  returnBtn: {
    backgroundColor: "#1F883D",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 90,
    alignItems: "center",
  },
  returnBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 24,
    borderTopWidth: 1,
    borderColor: "#D0D7DE",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D7DE",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2328",
  },
  closeChar: {
    fontSize: 20,
    color: "#656D76",
    fontWeight: "600",
  },
  modalErrorText: {
    color: "#CF222E",
    backgroundColor: "#FFEBE9",
    borderWidth: 1,
    borderColor: "#FFC1C0",
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2328",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2328",
    backgroundColor: "#FFFFFF",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#24292F",
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#1F883D",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 2,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
