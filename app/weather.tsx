// app/weather.tsx
import { AntDesign } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Dimensions,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import weatherData from "./data/example.json";

import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import { captureRef } from "react-native-view-shot";

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
	date?: string;
};

function getMonthDay(dateStr: string) {
	const d = dateStr.replace("_", "-").replace(/\//g, "-").split("-");
	return d.length === 3 ? `${d[1]}-${d[2]}` : "";
}

function getMonthDaysInRange(start: string, end: string): string[] {
	const startDate = new Date(start);
	const endDate = new Date(end);
	const days: string[] = [];

	let current = new Date(startDate);
	while (current <= endDate) {
		const month = String(current.getMonth() + 1).padStart(2, "0");
		const day = String(current.getDate()).padStart(2, "0");
		days.push(`${month}-${day}`);
		current.setDate(current.getDate() + 1);
	}

	return days;
}

function getWeatherMatches(
	data: Record<string, WeatherData>,
	lat: string,
	lng: string,
	targetMonthDay: string
	): WeatherData[] {
		const matches: WeatherData[] = [];
		Object.entries(data).forEach(([key, value]) => {
			const [kLat, kLng, kDate] = key.split("_");
			if (kLat === lat && kLng === lng && getMonthDay(kDate) === targetMonthDay) {
				matches.push({ ...(value as WeatherData), date: kDate });
			}
		});
		return matches;
}

function getWeatherMatchesInRange(
	data: Record<string, WeatherData>,
	lat: string,
	lng: string,
	monthDays: string[]
	): WeatherData[] {
		const matches: WeatherData[] = [];
		Object.entries(data).forEach(([key, value]) => {
			const [kLat, kLng, kDate] = key.split("_");
			if (kLat === lat && kLng === lng && monthDays.includes(getMonthDay(kDate))) {
				matches.push({ ...(value as WeatherData), date: kDate });
			}
		});
		return matches;
}

type RowItem = {
	key: string;
	value: number | string;
	details: Record<string, any>;
};

export default function WeatherScreen() {
	const params = useLocalSearchParams();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const {
		location,
		latitude,
		longitude,
		dateMode,
		date,
		startDate,
		endDate
	} = params as {
		location: string;
		latitude: string;
		longitude: string;
		dateMode: string;
		date: string;
		startDate: string;
		endDate: string
	};
	const [targetDate, setTargetDate] = useState(date || "");
	function replaceMonthDayInDate(originalDate: string, newMonthDay: string) {
		const [year] = originalDate.split("-");
		return `${year}-${newMonthDay}`;
	}
	const targetLatitude = Number(latitude).toFixed(3);
	const targetLongitude = Number(longitude).toFixed(3);

	const [weather, setWeather] = useState<WeatherData | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
	const animationValues = useRef<Record<string, Animated.Value>>({}).current;
	const screenRef = useRef<View>(null);

	// User preferences
	const [useFahrenheit, setUseFahrenheit] = useState(false);
	const [useDewPoint, setUseDewPoint] = useState(false);
	const [useMiles, setUseMiles] = useState(false);

	// Bottom settings panel
	const [settingsVisible, setSettingsVisible] = useState(false);
	const settingsAnim = useRef(new Animated.Value(0)).current;

	const [weatherList, setWeatherList] = useState<WeatherData[]>([]);


	useEffect(() => {
		if (!targetDate) {
			const targetMonthDays = getMonthDaysInRange(startDate, endDate);
			const matches = getWeatherMatchesInRange(weatherData, targetLatitude, targetLongitude, targetMonthDays);

			if (matches.length === 0) {
				console.warn("No matches in range");
				setWeatherList([]);
				return;
			}

			const grouped: Record<string, WeatherData[]> = {};
			matches.forEach(m => {
				if (!m.date) return;
				if (!grouped[m.date]) grouped[m.date] = [];
				grouped[m.date].push(m);
			});

			const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

			const dailyAvgs = Object.entries(grouped).map(([date, items]) => {
				return {
				date,
				temp: avg(items.map(w => w.temp)),
				rainChance: avg(items.map(w => w.rainChance)),
				snowChance: avg(items.map(w => w.snowChance)),
				precipitation: avg(items.map(w => w.precipitation)),
				wind: avg(items.map(w => w.wind)),
				airQuality: items[0].airQuality,
				uvIndex: avg(items.map(w => w.uvIndex)),
				humidity: avg(items.map(w => w.humidity)),
				cloudCover: avg(items.map(w => w.cloudCover)),
				} as WeatherData;
			});

			const hottestAvg = dailyAvgs.reduce((prev, curr) =>
				curr.temp > prev.temp ? curr : prev
			);
			const hottestMonthDay = getMonthDay(hottestAvg.date!);
			setTargetDate(replaceMonthDayInDate(endDate || hottestAvg.date!, hottestMonthDay));
		}

		const targetMonthDay = getMonthDay(targetDate);
		const matches = getWeatherMatches(weatherData, targetLatitude, targetLongitude, targetMonthDay);

		if (matches.length === 0) {
			matches.push({
				temp: NaN,
				rainChance: 0,
				snowChance: 0,
				precipitation: 0,
				wind: 0,
				airQuality: "Unknown",
				uvIndex: 0,
				humidity: 0,
				cloudCover: 0,
				date,
			});
		}

		matches.sort((a, b) => {
			if (!a.date || !b.date) return 0;
			return a.date.localeCompare(b.date);
		});

		setWeatherList(matches);

		const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
		const weatherAvg: WeatherData = {
			temp: avg(matches.map(w => w.temp)),
			rainChance: avg(matches.map(w => w.rainChance)),
			snowChance: avg(matches.map(w => w.snowChance)),
			precipitation: avg(matches.map(w => w.precipitation)),
			wind: avg(matches.map(w => w.wind)),
			airQuality: matches[0].airQuality,
			uvIndex: avg(matches.map(w => w.uvIndex)),
			humidity: avg(matches.map(w => w.humidity)),
			cloudCover: avg(matches.map(w => w.cloudCover)),
			date,
		};

		setWeather(weatherAvg);
		setLoading(false);
	}, [date, targetDate]);

	if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

	function steadmanApparentTemp(tempC: number, humidity: number, wind: number) {
		const e = (humidity / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
		return 1.04 * tempC + 0.2 * e - 0.65 * wind - 2.7;
	}

	function magnusDewPoint(tempC: number, humidity: number) {
		const a = 17.27;
		const b = 237.7;
		const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity + 0.001 / 100);
		return (b * alpha) / (a - alpha);
	}

	const convertTemp = (val: number) => (useFahrenheit ? val * 1.8 + 32 : val).toFixed(1);
	const convertPrecipitation = (val: number) => (useMiles ? val * 0.03937 : val).toFixed(1);
	const convertHumidity = (val: number) => (useDewPoint ? magnusDewPoint(weather!.temp, val) : val).toFixed(1);

	const rows: RowItem[] = [
		{
			key: "氣溫",
			value: convertTemp(weather!.temp),
			details: {
				"單位": useFahrenheit ? "°F" : "°C",
				"體感溫度": convertTemp(steadmanApparentTemp(weather!.temp, weather!.humidity, weather!.wind)) + " " + (useFahrenheit ? "°F" : "°C"),
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

	async function shareAsJson() {
		if (!weather) return;
		const fileUri = (FileSystem as any).cacheDirectory + `weather_${targetLatitude}_${targetLongitude}_${targetDate}.json`;
		await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(weather, null, 2));
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(fileUri);
		} else {
			alert("Sharing not available on this platform.");
		}
	}

	async function shareScreenshot() {
		try {
			const uri = await captureRef(screenRef, { format: "png", quality: 0.9 });
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(uri);
			} else {
				alert("Sharing not available on this platform.");
			}
		} catch (err) {
			console.error("Screenshot failed", err);
		}
	}

	function downloadJsonWeb() {
		if (!weather) return;
		const blob = new Blob([JSON.stringify(weather, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `weather_${targetLatitude}_${targetLongitude}_${targetDate}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function downloadScreenshotWeb() {
		alert("請使用分享功能進行截圖");
		// if (Platform.OS !== "web") return;
		//     try {
		//         const element = document.querySelector("#weather-container") as HTMLElement;
		//         if (!element) return;

		//         const canvas = await html2canvas(element);
		//         const dataUrl = canvas.toDataURL("image/png");

		//         const a = document.createElement("a");
		//         a.href = dataUrl;
		//         a.download = `weather_${targetLatitude}_${targetLongitude}_${targetDate}.png`;
		//         a.click();
		//     } catch (err) {
		//         console.error("Web screenshot failed", err);
		//     }
	}

	const chartWidth = Math.min(
		Platform.OS === "web"
			? (window.innerWidth ? window.innerWidth - 80 : 500)
			: Dimensions.get("window").width - 80,
		600
	);

	const renderRow = (item: RowItem) => {
		const isExpanded = !!expandedRows[item.key];
		if (!animationValues[item.key]) animationValues[item.key] = new Animated.Value(isExpanded ? 1 : 0);

		const rotate = animationValues[item.key].interpolate({
			inputRange: [0, 1],
			outputRange: ["0deg", "90deg"],
		});

		const fadeAnim = animationValues[item.key].interpolate({
			inputRange: [0, 1],
			outputRange: [0, 1],
		});

		const showLineChart = (key: string) =>
			["氣溫", "降水量", "風速", "空氣品質", "紫外線", "濕度", "雲層厚度"].includes(key) &&
			weatherList.length > 1 &&
			isExpanded;

		const showDistChart = (key: string) =>
			["氣溫", "降水量", "風速", "紫外線", "濕度", "雲層厚度"].includes(key) &&
			weatherList.length > 1 &&
			isExpanded;

		const getDistChartData = (key: string) => {
			let values: number[] = [];
			let binWidth = 1;
			let unit = "";
			switch (key) {
				case "氣溫":
					values = weatherList.map(w => useFahrenheit ? w.temp * 1.8 + 32 : w.temp).filter(v => !isNaN(v));
					binWidth = useFahrenheit ? 10 : 5;
					unit = useFahrenheit ? "°F" : "°C";
					break;
				case "降水量":
					values = weatherList.map(w => useMiles ? w.precipitation * 0.03937 : w.precipitation).filter(v => !isNaN(v));
					binWidth = useMiles ? 0.1 : 2.5;
					unit = useMiles ? "in" : "mm";
					break;
				case "風速":
					values = weatherList.map(w => w.wind).filter(v => !isNaN(v));
					binWidth = 1;
					unit = "m/s";
					break;
				case "紫外線":
					values = weatherList.map(w => w.uvIndex).filter(v => !isNaN(v));
					binWidth = 1;
					unit = "";
					break;
				case "濕度":
					values = weatherList.map(w => useDewPoint ? magnusDewPoint(w.temp, w.humidity) : w.humidity).filter(v => !isNaN(v));
					binWidth = useDewPoint ? 4 : 5;
					unit = useDewPoint ? "°C" : "%";
					break;
				case "雲層厚度":
					values = weatherList.map(w => w.cloudCover).filter(v => !isNaN(v));
					binWidth = 10;
					unit = "%";
					break;
				default:
					return { labels: [], datasets: [{ data: [] }] };
			}
			if (values.length === 0) return { labels: [], datasets: [{ data: [] }] };
			const min = Math.floor(Math.min(...values) / binWidth) * binWidth;
			const max = Math.ceil(Math.max(...values) / binWidth) * binWidth;
			const bins: number[] = [];
			const labels: string[] = [];
			for (let t = min; t < max; t += binWidth) {
				bins.push(t);
				labels.push(`${t.toFixed(1)}~${(t + binWidth).toFixed(1)}${unit}`);
			}
			bins.push(max);
			labels.push(`${max.toFixed(1)}${unit}` + " +");

			const counts = bins.map((bin, i) =>
				values.filter(
					v =>
						v >= bin &&
						(i === bins.length - 1 ? v <= bin + binWidth : v < bin + binWidth)
				).length
			);
			return {
				labels,
				datasets: [{ data: counts }],
			};
		};

		const getChartData = (key: string) => {
			switch (key) {
				case "氣溫":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => useFahrenheit ? w.temp * 1.8 + 32 : w.temp),
								color: () => "#00BFFF",
								strokeWidth: 2,
							},
						],
					};
				case "降水量":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => useMiles ? w.precipitation * 0.03937 : w.precipitation),
								color: () => "#00BFFF",
								strokeWidth: 2,
							},
						],
					};
				case "風速":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => w.wind),
								color: () => "#FF8C00",
								strokeWidth: 2,
							},
						],
					};
				case "空氣品質":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => {
									const v = w.airQuality;
									if (typeof v === "number") return v;
									switch (v) {
										case "優": return 1;
										case "良": return 2;
										case "普通": return 3;
										case "差": return 4;
										case "非常差": return 5;
										default: return 0;
									}
								}),
								color: () => "#32CD32",
								strokeWidth: 2,
							},
						],
					};
				case "紫外線":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => w.uvIndex),
								color: () => "#9400D3",
								strokeWidth: 2,
							},
						],
					};
				case "濕度":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => useDewPoint ? magnusDewPoint(w.temp, w.humidity) : w.humidity),
								color: () => "#1E90FF",
								strokeWidth: 2,
							},
						],
					};
				case "雲層厚度":
					return {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [
							{
								data: weatherList.map(w => w.cloudCover),
								color: () => "#A9A9A9",
								strokeWidth: 2,
							},
						],
					};
				default:
					return null;
			}
		};

		const getYAxisSuffix = (key: string) => {
			switch (key) {
				case "降水量":
					return useMiles ? "in" : "mm";
				case "風速":
					return "m/s";
				case "空氣品質":
					return "";
				case "紫外線":
					return "";
				case "濕度":
					return useDewPoint ? "°C" : "%";
				case "雲層厚度":
					return "%";
				default:
					return "";
			}
		};

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
				</View>

				{isExpanded && item.details && Object.keys(item.details).length > 0 && (
					<Animated.View style={[styles.detailsContainer, { opacity: fadeAnim }]}>
						{Object.entries(item.details).map(([k, v]) => (
							<Text key={k} style={styles.detailText}>
								{k}: {typeof v === "number" ? v.toFixed(1) : v}
							</Text>
						))}
						{showLineChart(item.key) && (
							<View style={{ marginTop: 10, marginBottom: 5 }}>
								<Text style={{ fontSize: 15, marginBottom: 5 }}>
									歷年同日{item.key}變化
								</Text>
								<LineChart
									data={getChartData(item.key)!}
									width={chartWidth}
									height={Math.max(150, chartWidth * 0.35)}
									yAxisSuffix={getYAxisSuffix(item.key)}
									chartConfig={{
										backgroundColor: "#fff",
										backgroundGradientFrom: "#fff",
										backgroundGradientTo: "#fff",
										decimalPlaces: 1,
										color: (opacity = 1) => `rgba(0,122,255,${opacity})`,
										labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
										style: { borderRadius: 8 },
										propsForDots: { r: "4", strokeWidth: "2", stroke: "#007AFF" },
									}}
									bezier
									style={{ borderRadius: 8 }}
								/>
							</View>
						)}
						{showDistChart(item.key) && (
							<View style={{ marginTop: 10, marginBottom: 5 }}>
								<Text style={{ fontSize: 15, marginBottom: 5 }}>
									{item.key}分布圖
								</Text>
								<BarChart
									data={getDistChartData(item.key)}
									width={chartWidth}
									height={Math.max(150, chartWidth * 0.35)}
									yAxisLabel=""
									yAxisSuffix=""
									chartConfig={{
										backgroundColor: "#fff",
										backgroundGradientFrom: "#fff",
										backgroundGradientTo: "#fff",
										decimalPlaces: 0,
										color: (opacity = 1) => `rgba(0,122,255,${opacity})`,
										labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
										style: { borderRadius: 8 },
									}}
									style={{ borderRadius: 8 }}
									fromZero
									showValuesOnTopOfBars
								/>
							</View>
						)}
					</Animated.View>
				)}
			</View>
		);
	};

	const toggleSettingsPanel = () => {
		Animated.timing(settingsAnim, {
			toValue: settingsVisible ? 0 : 1,
			duration: 300,
			useNativeDriver: false,
		}).start();
		setSettingsVisible(!settingsVisible);
	};

	const SettingsPanel = () => {
		const translateY = settingsAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [btnPanelHeight, 0],
		});

		return (
			<Animated.View
				style={[
					styles.bottomSettings,
					{
						height: btnPanelHeight,
						opacity: settingsAnim,
						transform: [{ translateY }],
					},
				]}
			>
				<View style={styles.settingRow}>
					<Text>Use Fahrenheit</Text>
					<Switch value={useFahrenheit} onValueChange={setUseFahrenheit} />
				</View>
				<View style={styles.settingRow}>
					<Text>Show Dew Point</Text>
					<Switch value={useDewPoint} onValueChange={setUseDewPoint} />
				</View>
				<View style={styles.settingRow}>
					<Text>Use Inches</Text>
					<Switch value={useMiles} onValueChange={setUseMiles} />
				</View>
			</Animated.View>
		);
	};

	const chartData = {
		labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
		datasets: [
			{
				data: weatherList.map(w => useFahrenheit ? w.temp * 1.8 + 32 : w.temp),
				color: () => "#007AFF",
				strokeWidth: 2,
			},
		],
	};

	const btnPanelHeight = Platform.OS === "web" ? 210 : 150;
	const btnHeight = Platform.OS === "web" ? 80 : 20;
	const btnBottom = settingsAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [btnHeight, btnPanelHeight],
	});

	return (
		<View style={{ flex: 1 }}>
			<View style={{ position: "absolute", top: insets.top, right: 0, left: 0, zIndex: 9999, backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 10, flexDirection: "row", justifyContent: "flex-end", gap: 10, elevation: 20 }}>
				<TouchableOpacity
					style={styles.shareBtn}
					onPress={Platform.OS === "web" ? downloadJsonWeb : shareAsJson}
				>
					<Text style={styles.shareText}>獲得JSON</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.shareBtn}
					onPress={Platform.OS === "web" ? downloadScreenshotWeb : shareScreenshot}
				>
					<Text style={styles.shareText}>截圖</Text>
				</TouchableOpacity>
			</View>

			<SafeAreaView style={{ flex: 1, paddingTop: 60 }} ref={screenRef}>
				{Platform.OS === "web" ? (
					<div style={{ overflowY: "auto", height: "100vh", padding: 10 }}>
						<View id="weather-container">
							<Text style={{ fontSize: 18, marginBottom: 10 }}>
								天氣資訊 ({targetDate}) -{"\n"}
								緯度 {Number(targetLatitude).toFixed(3)}, 經度 {Number(targetLongitude).toFixed(3)}
							</Text>
							{rows.map((item) => renderRow(item))}
							<View style={{ height: settingsVisible ? btnPanelHeight + 20 : btnHeight + 20 }} />
						</View>
					</div>
				) : (
					<ScrollView
						style={{ flex: 1, minHeight: 0, padding: 10 }}
						contentContainerStyle={{ paddingBottom: 50 }}
					>
						<View id="weather-container">
							<Text style={{ fontSize: 18, marginBottom: 10 }}>
								天氣資訊 ({targetDate}) -{"\n"}
								緯度 {Number(targetLatitude).toFixed(3)}, 經度 {Number(targetLongitude).toFixed(3)}
							</Text>
							{rows.map((item) => renderRow(item))}
							<View style={{ height: settingsVisible ? btnPanelHeight + 20 : btnHeight + 20 }} />
						</View>
					</ScrollView>
				)}

				<Animated.View
					style={[
						{ position: "absolute", left: 0, right: 0, zIndex: 1001, bottom: btnBottom }
					]}
				>
					<TouchableOpacity
						style={styles.toggleSettingsBtn}
						onPress={toggleSettingsPanel}
						activeOpacity={0.7}
					>
						<Text style={{ color: "#007AFF", fontWeight: "bold" }}>
							{settingsVisible ? "隱藏設定" : "顯示設定"}
						</Text>
					</TouchableOpacity>
				</Animated.View>

				<SettingsPanel />
			</SafeAreaView>
		</View>
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
	fixedButtons: {
		position: "absolute",
		top: 10,
		right: 10,
		flexDirection: "row",
		gap: 10,
		zIndex: 9999,      // 提高 zIndex
		elevation: 20,     // Android 也要
		pointerEvents: "box-none",
	},
	shareBtn: {
		backgroundColor: "#007AFF",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 6,
	},
	shareText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
	},
	bottomSettings: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		borderTopWidth: 1,
		borderTopColor: "#ddd",
		overflow: "hidden",
		zIndex: 1000,
	},
	settingRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
		paddingVertical: 5,
	},
	toggleSettingsBtn: {
		alignItems: "center",
		paddingVertical: 5,
		backgroundColor: "#f2f2f2",
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#ddd",
	},
});
