import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function WeatherScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    // 解構參數
    const {
        location,
        latitude,
        longitude,
        dateMode,
        date,
        startDate,
        endDate
    } = params;

    const [isLoading, setIsLoading] = useState(false);

    // 在組件載入時顯示接收到的參數
    useEffect(() => {
        console.log('Weather Screen - Received params:', {
            location,
            latitude,
            longitude,
            dateMode,
            date,
            startDate,
            endDate
        });
    }, []);

    // 格式化日期顯示
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const dateObj = new Date(dateString);
        return dateObj.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    };

    // 計算日期範圍的天數
    const getDaysDifference = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // 包含開始和結束日
    };

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
            { day: "Today", high: "28°", low: "18°", icon: "☀️", date: new Date().toISOString().split('T')[0] },
            { day: "Tomorrow", high: "25°", low: "16°", icon: "⛅", date: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
            { day: "Wed", high: "22°", low: "14°", icon: "🌧️", date: new Date(Date.now() + 172800000).toISOString().split('T')[0] },
            { day: "Thu", high: "24°", low: "15°", icon: "🌤️", date: new Date(Date.now() + 259200000).toISOString().split('T')[0] },
            { day: "Fri", high: "26°", low: "17°", icon: "☀️", date: new Date(Date.now() + 345600000).toISOString().split('T')[0] },
            { day: "Sat", high: "23°", low: "16°", icon: "⛅", date: new Date(Date.now() + 432000000).toISOString().split('T')[0] },
            { day: "Sun", high: "21°", low: "14°", icon: "🌧️", date: new Date(Date.now() + 518400000).toISOString().split('T')[0] },
        ]
    };

    // 根據選擇的日期過濾預報數據
    const getFilteredForecast = () => {
        if (dateMode === 'single' && date) {
            // 單一日期：只顯示該日期的天氣
            return weatherData.forecast.filter(day => day.date === date);
        } else if (dateMode === 'range' && startDate && endDate) {
            // 日期區間：顯示範圍內的所有天氣
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);
            return weatherData.forecast.filter(day => {
                const dayDate = new Date(day.date);
                return dayDate >= start && dayDate <= end;
            });
        }
        // 沒有選擇日期則顯示未來3天
        return weatherData.forecast.slice(0, 3);
    };

    const filteredForecast = getFilteredForecast();

    // 模擬API調用
    const refreshWeatherData = async () => {
        setIsLoading(true);

        // 這裡可以調用實際的天氣API
        console.log('Fetching weather for:', {
            lat: latitude,
            lon: longitude,
            dateMode,
            date: dateMode === 'single' ? date : null,
            startDate: dateMode === 'range' ? startDate : null,
            endDate: dateMode === 'range' ? endDate : null
        });

        // 模擬延遲
        setTimeout(() => {
            setIsLoading(false);
            Alert.alert("Success", "Weather data refreshed!");
        }, 1000);
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
                <Text style={styles.coordinates}>
                    {latitude && longitude ? `${Number(latitude).toFixed(4)}°, ${Number(longitude).toFixed(4)}°` : ''}
                </Text>
                <Text style={styles.currentTemp}>{weatherData.current.temperature}</Text>
                <Text style={styles.condition}>{weatherData.current.condition}</Text>
                <Text style={styles.lastUpdated}>Last updated: Just now</Text>
            </View>

            {/* 日期資訊卡片 */}
            {(date || (startDate && endDate)) && (
                <View style={styles.dateInfoCard}>
                    <Text style={styles.dateInfoTitle}>
                        📅 {dateMode === 'single' ? '查詢日期' : '查詢日期區間'}
                    </Text>
                    {dateMode === 'single' && date ? (
                        <Text style={styles.dateInfoText}>
                            {formatDate(date as string)}
                        </Text>
                    ) : (
                        <View>
                            <Text style={styles.dateInfoText}>
                                從 {formatDate(startDate as string)}
                            </Text>
                            <Text style={styles.dateInfoText}>
                                到 {formatDate(endDate as string)}
                            </Text>
                            <Text style={styles.dateInfoDays}>
                                共 {getDaysDifference(startDate as string, endDate as string)} 天
                            </Text>
                        </View>
                    )}
                </View>
            )}

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

            {/* 天氣預報 */}
            <Text style={styles.sectionTitle}>
                {filteredForecast.length > 0
                    ? `${filteredForecast.length}-Day Forecast`
                    : 'Weather Forecast'}
            </Text>

            {filteredForecast.length > 0 ? (
                filteredForecast.map((day, index) => (
                    <View key={index} style={styles.forecastCard}>
                        <View style={styles.forecastLeft}>
                            <Text style={styles.forecastDay}>{day.day}</Text>
                            <Text style={styles.forecastDate}>{formatDate(day.date)}</Text>
                        </View>
                        <Text style={styles.forecastIcon}>{day.icon}</Text>
                        <View style={styles.forecastTemp}>
                            <Text style={styles.forecastHigh}>{day.high}</Text>
                            <Text style={styles.forecastLow}>{day.low}</Text>
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.noDataCard}>
                    <Text style={styles.noDataText}>
                        📭 No forecast data available for selected date(s)
                    </Text>
                </View>
            )}

            {/* 功能按鈕 */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
                    onPress={refreshWeatherData}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>🔄 Refresh Data</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        const shareText = `Weather at ${location}\n${dateMode === 'single' ? formatDate(date as string) : `${formatDate(startDate as string)} - ${formatDate(endDate as string)}`}\nLat: ${latitude}, Lon: ${longitude}`;
                        Alert.alert("Share Weather", shareText);
                    }}
                >
                    <Text style={styles.actionButtonText}>📤 Share Weather</Text>
                </TouchableOpacity>
            </View>

            {/* Debug 資訊（開發時可用） */}
            {__DEV__ && (
                <View style={styles.debugCard}>
                    <Text style={styles.debugTitle}>🔧 Debug Info</Text>
                    <Text style={styles.debugText}>Latitude: {latitude}</Text>
                    <Text style={styles.debugText}>Longitude: {longitude}</Text>
                    <Text style={styles.debugText}>Date Mode: {dateMode}</Text>
                    {dateMode === 'single' && (
                        <Text style={styles.debugText}>Date: {date}</Text>
                    )}
                    {dateMode === 'range' && (
                        <>
                            <Text style={styles.debugText}>Start: {startDate}</Text>
                            <Text style={styles.debugText}>End: {endDate}</Text>
                        </>
                    )}
                </View>
            )}
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
        marginBottom: 4,
    },
    coordinates: {
        fontSize: 12,
        color: "#95a5a6",
        marginBottom: 8,
        fontFamily: 'monospace',
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
    dateInfoCard: {
        backgroundColor: "#667eea",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    dateInfoTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 8,
    },
    dateInfoText: {
        fontSize: 18,
        color: "#fff",
        fontWeight: "500",
        marginBottom: 4,
    },
    dateInfoDays: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.8)",
        marginTop: 8,
        fontStyle: "italic",
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
    forecastLeft: {
        flex: 1,
    },
    forecastDay: {
        fontSize: 16,
        fontWeight: "500",
        color: "#2c3e50",
    },
    forecastDate: {
        fontSize: 12,
        color: "#95a5a6",
        marginTop: 2,
    },
    forecastIcon: {
        fontSize: 24,
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
    noDataCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        marginBottom: 12,
    },
    noDataText: {
        fontSize: 16,
        color: "#7f8c8d",
        textAlign: "center",
    },
    actionButtons: {
        marginTop: 20,
        marginBottom: 30,
        gap: 12,
    },
    actionButton: {
        backgroundColor: "#27ae60",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    actionButtonDisabled: {
        backgroundColor: "#95a5a6",
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    debugCard: {
        backgroundColor: "#2c3e50",
        borderRadius: 12,
        padding: 16,
        marginBottom: 30,
    },
    debugTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ecf0f1",
        marginBottom: 8,
    },
    debugText: {
        fontSize: 12,
        color: "#ecf0f1",
        fontFamily: 'monospace',
        marginBottom: 4,
    },
});