import React from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function WeatherScreen() {
    const { location } = useLocalSearchParams<{ location: string }>();
    const router = useRouter();

    // 模擬天氣數據（之後可以替換成API）
    const weatherData = {
        current: {
            temperature: "28°C",
            condition: "☀️ Sunny",
            precipitation: "10%",
            windSpeed: "12 km/h",
            humidity: "65%",
            pressure: "1013 hPa",
            aqi: "Good (42)",
            uvIndex: "7 (High)"
        },
        forecast: [
            { day: "Today", high: "28°", low: "18°", icon: "☀️" },
            { day: "Tomorrow", high: "25°", low: "16°", icon: "⛅" },
            { day: "Wed", high: "22°", low: "14°", icon: "🌧️" },
        ]
    };

    return (
        <ScrollView style={styles.container}>
            {/* 導航欄 */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => Alert.alert("Added to favorites!")}
                >
                    <Text style={styles.favoriteButtonText}>⭐</Text>
                </TouchableOpacity>
            </View>

            {/* 位置和當前天氣 */}
            <View style={styles.currentWeatherCard}>
                <Text style={styles.location}>📍 {location}</Text>
                <Text style={styles.currentTemp}>{weatherData.current.temperature}</Text>
                <Text style={styles.condition}>{weatherData.current.condition}</Text>
                <Text style={styles.lastUpdated}>Last updated: Just now</Text>
            </View>

            {/* 快速資訊卡片 */}
            <Text style={styles.sectionTitle}>Current Conditions</Text>

            <View style={styles.quickInfoRow}>
                <View style={styles.quickInfoCard}>
                    <Text style={styles.quickInfoIcon}>🌧️</Text>
                    <Text style={styles.quickInfoLabel}>Rain</Text>
                    <Text style={styles.quickInfoValue}>{weatherData.current.precipitation}</Text>
                </View>
                <View style={styles.quickInfoCard}>
                    <Text style={styles.quickInfoIcon}>💨</Text>
                    <Text style={styles.quickInfoLabel}>Wind</Text>
                    <Text style={styles.quickInfoValue}>{weatherData.current.windSpeed}</Text>
                </View>
                <View style={styles.quickInfoCard}>
                    <Text style={styles.quickInfoIcon}>💧</Text>
                    <Text style={styles.quickInfoLabel}>Humidity</Text>
                    <Text style={styles.quickInfoValue}>{weatherData.current.humidity}</Text>
                </View>
            </View>

            {/* 詳細資訊卡片 */}
            <Text style={styles.sectionTitle}>Detailed Information</Text>

            <View style={styles.card}>
                <Text style={styles.label}>🌫️ Air Quality Index</Text>
                <Text style={styles.value}>{weatherData.current.aqi}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>📉 Atmospheric Pressure</Text>
                <Text style={styles.value}>{weatherData.current.pressure}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>☀️ UV Index</Text>
                <Text style={styles.value}>{weatherData.current.uvIndex}</Text>
            </View>

            {/* 未來幾天預報 */}
            <Text style={styles.sectionTitle}>3-Day Forecast</Text>

            {weatherData.forecast.map((day, index) => (
                <View key={index} style={styles.forecastCard}>
                    <Text style={styles.forecastDay}>{day.day}</Text>
                    <Text style={styles.forecastIcon}>{day.icon}</Text>
                    <View style={styles.forecastTemp}>
                        <Text style={styles.forecastHigh}>{day.high}</Text>
                        <Text style={styles.forecastLow}>{day.low}</Text>
                    </View>
                </View>
            ))}

            {/* 功能按鈕 */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert("Refreshing weather data...")}
                >
                    <Text style={styles.actionButtonText}>🔄 Refresh Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert("Share feature coming soon!")}
                >
                    <Text style={styles.actionButtonText}>📤 Share Weather</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        backgroundColor: "#3498db",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    backButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    favoriteButton: {
        backgroundColor: "#f39c12",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    favoriteButtonText: {
        fontSize: 18,
    },
    currentWeatherCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    location: {
        fontSize: 18,
        color: "#7f8c8d",
        marginBottom: 8,
    },
    currentTemp: {
        fontSize: 48,
        fontWeight: "bold",
        color: "#2c3e50",
        marginBottom: 4,
    },
    condition: {
        fontSize: 18,
        color: "#34495e",
        marginBottom: 8,
    },
    lastUpdated: {
        fontSize: 12,
        color: "#95a5a6",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#2c3e50",
        marginBottom: 12,
        marginTop: 8,
    },
    quickInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    quickInfoCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        flex: 1,
        marginHorizontal: 4,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickInfoIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    quickInfoLabel: {
        fontSize: 12,
        color: "#7f8c8d",
        marginBottom: 2,
    },
    quickInfoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#2c3e50",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    label: {
        fontSize: 16,
        color: "#7f8c8d",
        marginBottom: 4,
    },
    value: {
        fontSize: 18,
        fontWeight: "600",
        color: "#2c3e50",
    },
    forecastCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    forecastDay: {
        fontSize: 16,
        fontWeight: "500",
        color: "#2c3e50",
        flex: 1,
    },
    forecastIcon: {
        fontSize: 20,
        marginHorizontal: 16,
    },
    forecastTemp: {
        flexDirection: "row",
        alignItems: "center",
    },
    forecastHigh: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2c3e50",
        marginRight: 8,
    },
    forecastLow: {
        fontSize: 14,
        color: "#7f8c8d",
    },
    actionButtons: {
        marginTop: 20,
        gap: 12,
    },
    actionButton: {
        backgroundColor: "#27ae60",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});