import React from "react";
import { View, TextInput, StyleSheet, Alert, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";

export default function Index() {
    const router = useRouter();

    const handleSelectLocation = (location: string) => {
        router.push({
            pathname: "/weather",
            params: { location },
        });
    };

    // 預設城市列表
    const popularCities = [
        "Tokyo", "New York", "London", "Paris", "Sydney"
    ];

    return (
        <View style={styles.container}>
            {/* 標題 */}
            <Text style={styles.title}>🌍 Global Weather</Text>

            {/* 搜尋欄 */}
            <TextInput
                placeholder="Search for a city..."
                style={styles.search}
                onSubmitEditing={(e) => handleSelectLocation(e.nativeEvent.text)}
            />

            {/* 快速選擇城市按鈕 */}
            <View style={styles.quickSelectContainer}>
                <Text style={styles.sectionTitle}>Quick Select:</Text>
                <View style={styles.buttonRow}>
                    {popularCities.map((city) => (
                        <TouchableOpacity
                            key={city}
                            style={styles.cityButton}
                            onPress={() => handleSelectLocation(city)}
                        >
                            <Text style={styles.cityButtonText}>{city}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 世界地圖 (改進版) */}
            <Text style={styles.sectionTitle}>Select from Map:</Text>
            <Svg width={350} height={200} viewBox="0 0 1000 500" style={styles.map}>
                {/* 北美洲 */}
                <Path
                    d="M100,150 L250,100 L300,250 L150,280 Z"
                    fill="#4CAF50"
                    stroke="#2E7D32"
                    strokeWidth="2"
                    onPress={() => handleSelectLocation("New York")}
                />

                {/* 歐洲 */}
                <Path
                    d="M400,120 L520,100 L540,180 L420,200 Z"
                    fill="#FF9800"
                    stroke="#F57C00"
                    strokeWidth="2"
                    onPress={() => handleSelectLocation("London")}
                />

                {/* 亞洲 */}
                <Path
                    d="M600,80 L800,120 L820,250 L650,280 Z"
                    fill="#2196F3"
                    stroke="#1976D2"
                    strokeWidth="2"
                    onPress={() => handleSelectLocation("Tokyo")}
                />

                {/* 南美洲 */}
                <Path
                    d="M200,300 L300,280 L320,400 L220,450 Z"
                    fill="#9C27B0"
                    stroke="#7B1FA2"
                    strokeWidth="2"
                    onPress={() => handleSelectLocation("São Paulo")}
                />

                {/* 澳洲 */}
                <Path
                    d="M700,350 L800,340 L820,400 L720,410 Z"
                    fill="#E91E63"
                    stroke="#C2185B"
                    strokeWidth="2"
                    onPress={() => handleSelectLocation("Sydney")}
                />

                {/* 城市標記點 */}
                <Circle cx="175" cy="200" r="4" fill="#fff" stroke="#333" strokeWidth="1" />
                <Circle cx="460" cy="150" r="4" fill="#fff" stroke="#333" strokeWidth="1" />
                <Circle cx="700" cy="180" r="4" fill="#fff" stroke="#333" strokeWidth="1" />
                <Circle cx="260" cy="375" r="4" fill="#fff" stroke="#333" strokeWidth="1" />
                <Circle cx="760" cy="375" r="4" fill="#fff" stroke="#333" strokeWidth="1" />
            </Svg>

            {/* 功能按鈕區域 */}
            <View style={styles.featureButtons}>
                <TouchableOpacity
                    style={[styles.featureButton, styles.primaryButton]}
                    onPress={() => Alert.alert("Coming Soon", "GPS location feature")}
                >
                    <Text style={styles.featureButtonText}>📍 Use My Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.featureButton, styles.secondaryButton]}
                    onPress={() => Alert.alert("Coming Soon", "Favorites feature")}
                >
                    <Text style={styles.featureButtonText}>⭐ My Favorites</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: "center",
        backgroundColor: "#f5f7fa",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#2c3e50",
        marginBottom: 20,
    },
    search: {
        width: "100%",
        height: 45,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 20,
        backgroundColor: "#fff",
        fontSize: 16,
    },
    quickSelectContainer: {
        width: "100%",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#34495e",
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
    },
    cityButton: {
        backgroundColor: "#3498db",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginBottom: 5,
    },
    cityButtonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "500",
    },
    map: {
        backgroundColor: "#e3f2fd",
        borderRadius: 12,
        marginBottom: 20,
    },
    featureButtons: {
        width: "100%",
        gap: 12,
    },
    featureButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryButton: {
        backgroundColor: "#27ae60",
    },
    secondaryButton: {
        backgroundColor: "#f39c12",
    },
    featureButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});