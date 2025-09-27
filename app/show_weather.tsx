// app/show_weather.tsx
// http://localhost:8081/show_weather?lat=23.97&lng=120.97&date=2025-09-28
import { AntDesign } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import weatherData from "./data/example.json";

type WeatherData = {
  temp: number;
  rainChance: number;
  snowChance: number;
  precipitation: number;
  wind: number;
  airQuality: string;
  uvIndex: number;
  humidity: number;
  cloudCover: number;
};

type RowItem = {
  key: string;
  value: number | string;
  details: Record<string, any>;
};

export default function ShowWeatherScreen() {
  const params = useLocalSearchParams();
  const { lat, lng, date } = params as { lat: string; lng: string; date: string };

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [settingsVisible, setSettingsVisible] = useState<Record<string, boolean>>({});

  // For opacity animation
  const animationValues = useRef<Record<string, Animated.Value>>({}).current;

  // User preferences
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  const [useDewPoint, setUseDewPoint] = useState(false);
  const [useMiles, setUseMiles] = useState(false);

  useEffect(() => {
    const key = `${lat}_${lng}_${date}`;
    const currentWeather = weatherData[key as keyof typeof weatherData] || {
      temp: NaN,
      rainChance: 0,
      snowChance: 0,
      precipitation: 0,
      wind: 0,
      airQuality: "Unknown",
      uvIndex: 0,
      humidity: 0,
      cloudCover: 0
    };
    setWeather(currentWeather);
    setLoading(false);
  }, [lat, lng, date]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  function steadmanApparentTemp(tempC: number, humidity: number, wind: number) {
    const e = (humidity / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
    return 1.04 * tempC + 0.2 * e - 0.65 * wind - 2.7;
  }
  function magnusDewPoint(tempC: number, humidity: number) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  }

  const convertTemp = (val: number) => (useFahrenheit ? val * 1.8 + 32 : val);
  const convertPrecipitation = (val: number) => (useMiles ? val * 0.03937 : val);
  const convertHumidity = (val: number) => (useDewPoint ? magnusDewPoint(weather!.temp, val) : val);

  let rows: RowItem[] = [
    {
      key: "氣溫",
      value: convertTemp(weather!.temp),
      details: {
        "單位": useFahrenheit ? "°F" : "°C",
        "體感溫度": convertTemp(steadmanApparentTemp(weather!.temp, weather!.humidity, weather!.wind)) +
                   " " + (useFahrenheit ? "°F" : "°C"),
        "說明": "體感溫度根據氣溫、濕度與風速計算得出"
      },
    },
    {
      key: "降水率",
      value: weather!.rainChance + weather!.snowChance,
      details: {
        "單位": "%",
        "降雨率": weather!.rainChance + " %",
        "降雪率": weather!.snowChance + " %",
        "說明": "降水率為降雨率與降雪率之和"
      }
    },
    {
      key: "降水量",
      value: convertPrecipitation(weather!.precipitation),
      details: {
        "單位": useMiles ? "in" : "mm"
      },
    },
    {
      key: "風速",
      value: weather!.wind,
      details: {
        "單位": "m/s",
      }
    },
    {
      key: "空氣品質",
      value: weather!.airQuality,
      details: {
        "說明": "根據 AQI 分級"
      }
    },
    {
      key: "紫外線",
      value: weather!.uvIndex,
      details: {
        "範圍": "0-11+"
      }
    },
    {
      key: "濕度",
      value: convertHumidity(weather!.humidity),
      details: {
        "單位": useDewPoint ? "°C" : "%",
        "說明": "露點溫度根據濕度與氣溫計算得出"
      },
    },
    {
      key: "雲層厚度",
      value: weather!.cloudCover,
      details: {
        "單位": "%"
      }
    },
  ];

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const isExpanded = !!prev[key];
      if (!animationValues[key]) animationValues[key] = new Animated.Value(isExpanded ? 1 : 0);

      Animated.timing(animationValues[key], {
        toValue: isExpanded ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return { ...prev, [key]: !isExpanded };
    });
  };

  const toggleSettings = (key: string) => {
    setSettingsVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderRow = (item: RowItem) => {
    const isExpanded = !!expandedRows[item.key];
    const showSettings = !!settingsVisible[item.key];

    if (!animationValues[item.key]) animationValues[item.key] = new Animated.Value(isExpanded ? 1 : 0);

    const rotate = animationValues[item.key].interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "90deg"],
    });

    const fadeAnim = animationValues[item.key].interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View key={item.key} style={styles.rowContainer}>
        <View style={styles.row}>
          <Pressable onPress={() => toggleRow(item.key)} style={styles.iconTouch}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <AntDesign name="caret-right" size={20} color="black" />
            </Animated.View>
          </Pressable>

          <Text style={styles.rowText}>
            {item.key}: {typeof item.value === "number" ? item.value.toFixed(1) : item.value}
            {item.details["單位"] ? ` ${item.details["單位"]}` : ""}
          </Text>

          <Pressable onPress={() => toggleSettings(item.key)} style={[styles.iconTouch, { marginLeft: "auto" }]}> 
            <AntDesign name="setting" size={20} color="#007AFF" />
          </Pressable>
        </View>

        {showSettings && (
          <View style={styles.settingsContainer}>
            {item.key === "氣溫" && (
              <View style={styles.settingRow}>
                <Text>Use Fahrenheit</Text>
                <Switch value={useFahrenheit} onValueChange={setUseFahrenheit} />
              </View>
            )}
            {item.key === "濕度" && (
              <View style={styles.settingRow}>
                <Text>Show Dew Point</Text>
                <Switch value={useDewPoint} onValueChange={setUseDewPoint} />
              </View>
            )}
            {item.key === "降水量" && (
              <View style={styles.settingRow}>
                <Text>Use Inches</Text>
                <Switch value={useMiles} onValueChange={setUseMiles} />
              </View>
            )}
          </View>
        )}

        {isExpanded && item.details && Object.keys(item.details).length > 0 && (
          <Animated.View style={[styles.detailsContainer, { opacity: fadeAnim }]}>
            {Object.entries(item.details).map(([k, v]) => (
              <Text key={k} style={styles.detailText}>
                {k}: {typeof v === "number" ? v.toFixed(1) : v}
              </Text>
            ))}
          </Animated.View>
        )}
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <div style={{ overflowY: 'auto', height: '100vh', padding: 10 }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            天氣資訊 ({date}) - 緯度 {lat}, 經度 {lng}
          </Text>
          {rows.map((item) => renderRow(item))}
        </div>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ padding: 10 }}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          天氣資訊 ({date}) - 緯度 {lat}, 經度 {lng}
        </Text>
        {rows.map((item) => renderRow(item))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
  },
  rowText: {
    fontSize: 16,
    marginLeft: 5,
  },
  iconTouch: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsContainer: {
    backgroundColor: "#e6f0ff",
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  settingsContainer: {
    backgroundColor: "#fff3e6",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
});
