// app/weather.tsx - Optimized for performance with back navigation
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React from "react";
import { captureRef } from "react-native-view-shot";

type WeatherData = {
	temp: number;
	rainChance: number;
	snowChance: number;
	precipitation: number;
	wind: number;
	uvIndex: number;
	humidity: number;
	cloudCover: number;
	date?: string;
};

type HighlightMetric =
	| "hottest" | "coldest" | "windiest" | "leastWindy"
	| "rainiest" | "leastRainy" | "wettest" | "driest"
	| "highestUV" | "lowestUV" | "mostHumid" | "leastHumid"
	| "cloudiest" | "clearest";

const highlightOptions: [string, HighlightMetric][] = [
	["Hottest Day", "hottest"],
	["Coldest Day", "coldest"],
	["Windiest Day", "windiest"],
	["Calmest Day", "leastWindy"],
	["Rainiest Day", "rainiest"],
	["Driest Day", "leastRainy"],
	["Wettest Day", "wettest"],
	["Least Wet Day", "driest"],
	["Highest UV Index", "highestUV"],
	["Lowest UV Index", "lowestUV"],
	["Most Humid Day", "mostHumid"],
	["Least Humid Day", "leastHumid"],
	["Cloudiest Day", "cloudiest"],
	["Clearest Day", "clearest"],
];

const btnPanelHeight = Platform.OS === "web" ? 320 : 260;
const btnHeight = Platform.OS === "web" ? 80 : 20;

// Utility functions
const getMonthDay = (dateStr: string) => {
	const d = dateStr.replace("_", "-").replace(/\//g, "-").split("-");
	return d.length === 3 ? `${d[1]}-${d[2]}` : "";
};

const getMonthDaysInRange = (start: string, end: string): string[] => {
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
};

const getWeatherMatches = (
	data: Record<string, WeatherData>,
	lat: string,
	lng: string,
	targetMonthDay: string
): WeatherData[] => {
	const matches: WeatherData[] = [];
	Object.entries(data).forEach(([key, value]) => {
		const [kLat, kLng, kDate] = key.split("_");
		if (kLat === lat && kLng === lng && getMonthDay(kDate) === targetMonthDay) {
			matches.push({ ...(value as WeatherData), date: kDate });
		}
	});
	return matches;
};

const getWeatherMatchesInRange = (
	data: Record<string, WeatherData>,
	lat: string,
	lng: string,
	monthDays: string[]
): WeatherData[] => {
	const matches: WeatherData[] = [];
	Object.entries(data).forEach(([key, value]) => {
		const [kLat, kLng, kDate] = key.split("_");
		if (kLat === lat && kLng === lng && monthDays.includes(getMonthDay(kDate))) {
			matches.push({ ...(value as WeatherData), date: kDate });
		}
	});
	return matches;
};

const replaceMonthDayInDate = (originalDate: string, newMonthDay: string) => {
	const [year] = originalDate.split("-");
	return `${year}-${newMonthDay}`;
};

const savePreference = async (key: string, value: any) => {
	try {
		await AsyncStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.error("Error saving preference", e);
	}
};

const loadPreference = async (key: string, defaultValue: any) => {
	try {
		const value = await AsyncStorage.getItem(key);
		return value !== null ? JSON.parse(value) : defaultValue;
	} catch (e) {
		console.error("Error loading preference", e);
		return defaultValue;
	}
};

const calculateStdDev = (values: number[]): number => {
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	const squareDiffs = values.map(value => Math.pow(value - avg, 2));
	const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
	return Math.sqrt(avgSquareDiff);
};

type RowItem = {
	key: string;
	value: number | string;
	details: Record<string, any>;
	probability?: string;
};

export default function WeatherScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
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
	const targetLatitude = Number(latitude).toFixed(3);
	const targetLongitude = Number(longitude).toFixed(3);

	const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
	const [weather, setWeather] = useState<WeatherData | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
	const animationValues = useRef<Record<string, Animated.Value>>({}).current;
	const screenRef = useRef<View>(null);

	// User preferences
	const [useFahrenheit, setUseFahrenheit] = useState(false);
	const [useDewPoint, setUseDewPoint] = useState(false);
	const [useMiles, setUseMiles] = useState(false);
	const [highlightMetric, setHighlightMetric] = useState<HighlightMetric>("hottest");
	const [showProbabilities, setShowProbabilities] = useState(true);
	const [settingsVisible, setSettingsVisible] = useState(false);
	const settingsAnim = useRef(new Animated.Value(0)).current;
	const [weatherList, setWeatherList] = useState<WeatherData[]>([]);

	// Calculation functions - memoized
	const steadmanApparentTemp = useCallback((tempC: number, humidity: number, wind: number) => {
		const e = (humidity / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
		return 1.04 * tempC + 0.2 * e - 0.65 * wind - 2.7;
	}, []);

	const magnusDewPoint = useCallback((tempC: number, humidity: number) => {
		const a = 17.27;
		const b = 237.7;
		const safe_humidity = Math.min(Math.max(humidity, 1), 100);
		const alpha = ((a * tempC) / (b + tempC)) + Math.log(safe_humidity / 100);
		return (b * alpha) / (a - alpha);
	}, []);

	// Conversion functions - memoized
	const convertTemp = useCallback((val: number) =>
			(useFahrenheit ? val * 1.8 + 32 : val).toFixed(1),
		[useFahrenheit]
	);

	const convertPrecipitation = useCallback((val: number) =>
			(useMiles ? val * 0.03937 : val).toFixed(1),
		[useMiles]
	);

	const convertWindSpeed = useCallback((val: number) =>
			(useMiles ? val * 2.23694 : val).toFixed(1),
		[useMiles]
	);

	const convertHumidity = useCallback((val: number) => {
		if (!weather) return "0.0";
		return (useDewPoint ? Number(convertTemp(magnusDewPoint(weather.temp, val))) : val).toFixed(1);
	}, [useDewPoint, convertTemp, magnusDewPoint, weather]);

	// Share functions
	const shareAsJson = useCallback(async () => {
		if (!weather || !weatherList.length) return;

		const metadata = {
			query_info: {
				location: location || `${targetLatitude}, ${targetLongitude}`,
				latitude: Number(targetLatitude),
				longitude: Number(targetLongitude),
				query_date: targetDate,
				date_mode: dateMode,
				start_date: startDate,
				end_date: endDate,
				is_area_query: params.isArea === 'true',
				generated_at: new Date().toISOString()
			},
			data_source: {
				provider: "NASA Earth Observations",
				years_analyzed: weatherList.map(w => w.date?.split('-')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', '),
				total_data_points: weatherList.length
			},
			units: {
				temperature: useFahrenheit ? "°F" : "°C",
				precipitation: useMiles ? "inches" : "mm",
				wind_speed: useMiles ? "mph" : "m/s",
				humidity: useDewPoint ? (useFahrenheit ? "°F (Dew Point)" : "°C (Dew Point)") : "%"
			},
			summary: {
				average_temperature: Number(convertTemp(weather.temp)),
				precipitation_probability: Number((weather.rainChance + weather.snowChance).toFixed(1)),
				average_wind_speed: Number(convertWindSpeed(weather.wind)),
				average_humidity: Number(convertHumidity(weather.humidity))
			},
			historical_data: weatherList.map(w => ({
				year: w.date?.split('-')[0],
				date: w.date,
				temperature: Number((useFahrenheit ? w.temp * 1.8 + 32 : w.temp).toFixed(1)),
				precipitation: Number((useMiles ? w.precipitation * 0.03937 : w.precipitation).toFixed(1)),
				wind_speed: Number((useMiles ? w.wind * 2.23694 : w.wind).toFixed(1))
			}))
		};

		const fileUri = (FileSystem as any).cacheDirectory + `nasa_weather_${targetLatitude}_${targetLongitude}_${targetDate}.json`;
		await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(metadata, null, 2));
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(fileUri);
		} else {
			alert("Sharing not available on this platform.");
		}
	}, [weather, weatherList, location, targetLatitude, targetLongitude, targetDate, dateMode, startDate, endDate, params.isArea, useFahrenheit, useMiles, useDewPoint, convertTemp, convertWindSpeed, convertHumidity]);

	const shareScreenshot = useCallback(async () => {
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
	}, []);

	const downloadJsonWeb = useCallback(() => {
		if (!weather || !weatherList.length) return;

		const metadata = {
			query_info: {
				location: location || `${targetLatitude}, ${targetLongitude}`,
				generated_at: new Date().toISOString()
			},
			data_source: "NASA Earth Observations",
			summary: {
				temperature: Number(convertTemp(weather.temp)),
				precipitation_probability: Number((weather.rainChance + weather.snowChance).toFixed(1))
			}
		};

		const blob = new Blob([JSON.stringify(metadata, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `nasa_weather_${targetLatitude}_${targetLongitude}_${targetDate}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}, [weather, weatherList, location, targetLatitude, targetLongitude, targetDate, convertTemp]);

	const downloadScreenshotWeb = useCallback(async () => {
		alert("Please use the web browser's built-in screenshot function (e.g. Print to PDF) to capture the content.");
	}, []);

	// Load preferences
	useEffect(() => {
		loadPreference("useFahrenheit", false).then(setUseFahrenheit);
		loadPreference("useDewPoint", false).then(setUseDewPoint);
		loadPreference("useMiles", false).then(setUseMiles);
		loadPreference("highlightMetric", "hottest").then(setHighlightMetric);
		loadPreference("showProbabilities", true).then(setShowProbabilities);
	}, []);

	useEffect(() => { savePreference("useFahrenheit", useFahrenheit); }, [useFahrenheit]);
	useEffect(() => { savePreference("useDewPoint", useDewPoint); }, [useDewPoint]);
	useEffect(() => { savePreference("useMiles", useMiles); }, [useMiles]);
	useEffect(() => { savePreference("highlightMetric", highlightMetric); }, [highlightMetric]);
	useEffect(() => { savePreference("showProbabilities", showProbabilities); }, [showProbabilities]);

	// Fetch weather data
	useEffect(() => {
		const callPython = async () => {
			const response = await fetch("https://will-it-rain-on-my-parade-ecc0.onrender.com/getWeather", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					latitude: targetLatitude,
					longitude: targetLongitude,
					date: date,
					startDate: startDate,
					endDate: endDate
				}),
			});
			setWeatherData(await response.json());
		};
		callPython();
	}, [date, targetLatitude, targetLongitude, startDate, endDate]);

	// Process weather data
	useEffect(() => {
		if (startDate && endDate) {
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

			const dailyAvgs = Object.entries(grouped).map(([date, items]) => ({
				date,
				temp: avg(items.map(w => w.temp)),
				rainChance: avg(items.map(w => w.rainChance)),
				snowChance: avg(items.map(w => w.snowChance)),
				precipitation: avg(items.map(w => w.precipitation)),
				wind: avg(items.map(w => w.wind)),
				uvIndex: avg(items.map(w => w.uvIndex)),
				humidity: avg(items.map(w => w.humidity)),
				cloudCover: avg(items.map(w => w.cloudCover)),
			} as WeatherData));

			const targetDay = dailyAvgs.reduce((prev, curr) => {
				switch (highlightMetric) {
					case "hottest": return curr.temp > prev.temp ? curr : prev;
					case "coldest": return curr.temp < prev.temp ? curr : prev;
					case "windiest": return curr.wind > prev.wind ? curr : prev;
					case "leastWindy": return curr.wind < prev.wind ? curr : prev;
					case "rainiest": return (curr.rainChance + curr.snowChance) > (prev.rainChance + prev.snowChance) ? curr : prev;
					case "leastRainy": return (curr.rainChance + curr.snowChance) < (prev.rainChance + prev.snowChance) ? curr : prev;
					case "wettest": return curr.precipitation > prev.precipitation ? curr : prev;
					case "driest": return curr.precipitation < prev.precipitation ? curr : prev;
					case "highestUV": return curr.uvIndex > prev.uvIndex ? curr : prev;
					case "lowestUV": return curr.uvIndex < prev.uvIndex ? curr : prev;
					case "mostHumid": return curr.humidity > prev.humidity ? curr : prev;
					case "leastHumid": return curr.humidity < prev.humidity ? curr : prev;
					case "cloudiest": return curr.cloudCover > prev.cloudCover ? curr : prev;
					case "clearest": return curr.cloudCover < prev.cloudCover ? curr : prev;
					default: return prev;
				}
			});

			const targetMonthDay = getMonthDay(targetDay.date!);
			setTargetDate(replaceMonthDayInDate(endDate || targetDay.date!, targetMonthDay));
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
			uvIndex: avg(matches.map(w => w.uvIndex)),
			humidity: avg(matches.map(w => w.humidity)),
			cloudCover: avg(matches.map(w => w.cloudCover)),
			date,
		};

		setWeather(weatherAvg);
		setLoading(false);
	}, [weatherData, targetDate, highlightMetric, targetLatitude, targetLongitude, date, startDate, endDate]);

	// Calculate probabilities - memoized
	const calculateProbability = useCallback((key: string, threshold: number): string => {
		let count = 0;
		weatherList.forEach(w => {
			let value = 0;
			switch (key) {
				case "Temperature":
					value = useFahrenheit ? w.temp * 1.8 + 32 : w.temp;
					if (value > threshold) count++;
					break;
				case "Precipitation Amount":
					value = useMiles ? w.precipitation * 0.03937 : w.precipitation;
					if (value > threshold) count++;
					break;
				case "Wind Speed":
					if (w.wind > threshold) count++;
					break;
			}
		});
		return `${((count / weatherList.length) * 100).toFixed(1)}%`;
	}, [weatherList, useFahrenheit, useMiles]);

	// Memoized rows data
	const rows: RowItem[] = useMemo(() => {
		if (!weather) return [];
		return [
			{
				key: "Temperature",
				value: convertTemp(weather.temp),
				probability: showProbabilities ? `${calculateProbability("Temperature", useFahrenheit ? 90 : 32)} above ${useFahrenheit ? '90°F' : '32°C'}` : undefined,
				details: {
					"Unit": useFahrenheit ? "°F" : "°C",
					"Apparent Temperature": convertTemp(steadmanApparentTemp(weather.temp, weather.humidity, weather.wind)) + " " + (useFahrenheit ? "°F" : "°C"),
					"Years of Data": `${weatherList.length} years`,
					"Data Range": weatherList.length > 0 ? `${convertTemp(Math.min(...weatherList.map(w => w.temp)))} to ${convertTemp(Math.max(...weatherList.map(w => w.temp)))}` : "N/A",
				},
			},
			{
				key: "Precipitation Probability",
				value: weather.rainChance + weather.snowChance,
				details: {
					"Unit": "%",
					"Rain Probability": weather.rainChance.toFixed(1) + " %",
					"Snow Probability": weather.snowChance.toFixed(1) + " %",
				}
			},
			{
				key: "Precipitation Amount",
				value: convertPrecipitation(weather.precipitation),
				probability: showProbabilities ? `${calculateProbability("Precipitation Amount", useMiles ? 0.5 : 10)} above ${useMiles ? '0.5 in' : '10 mm'}` : undefined,
				details: {
					"Unit": useMiles ? "in" : "mm",
				},
			},
			{
				key: "Wind Speed",
				value: convertWindSpeed(weather.wind),
				probability: showProbabilities ? `${calculateProbability("Wind Speed", useMiles ? 15 : 6.7)} above ${useMiles ? '15 mph' : '6.7 m/s'}` : undefined,
				details: {
					"Unit": useMiles ? "mph" : "m/s",
				}
			},
			{
				key: "UV Index",
				value: weather.uvIndex,
				details: {
					"Range": "0-11+",
					"Protection Needed": weather.uvIndex > 6 ? "High - Use sun protection" : "Moderate"
				}
			},
			{
				key: useDewPoint ? "Dew Point" : "Humidity",
				value: convertHumidity(weather.humidity),
				details: {
					"Unit": useDewPoint ? (useFahrenheit ? "°F" : "°C") : "%",
				},
			},
			{
				key: "Cloud Cover",
				value: weather.cloudCover.toFixed(1),
				details: {
					"Unit": "%"
				}
			},
		];
	}, [weather, convertTemp, convertPrecipitation, convertWindSpeed, convertHumidity, useFahrenheit, useMiles, useDewPoint, steadmanApparentTemp, weatherList, showProbabilities, calculateProbability]);

	const toggleRow = useCallback((key: string) => {
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
	}, [animationValues]);

	const chartWidth = useMemo(() => Math.min(
		Platform.OS === "web"
			? (window.innerWidth ? window.innerWidth - 80 : 500)
			: Dimensions.get("window").width - 80,
		600
	), []);

	// Optimized renderRow - only shows line chart, removes heavy bar chart
	const renderRow = useCallback((item: RowItem) => {
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

		const showChart = ["Temperature", "Precipitation Amount", "Wind Speed", "UV Index", "Humidity", "Cloud Cover"].includes(item.key) &&
			weatherList.length > 1 &&
			isExpanded;

		let chartData = null;
		let yAxisSuffix = "";

		if (showChart) {
			switch (item.key) {
				case "Temperature":
					yAxisSuffix = useFahrenheit ? "°F" : "°C";
					chartData = {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [{
							data: weatherList.map(w => useFahrenheit ? w.temp * 1.8 + 32 : w.temp),
							color: () => "#00BFFF",
							strokeWidth: 2,
						}],
					};
					break;
				case "Precipitation Amount":
					yAxisSuffix = useMiles ? "in" : "mm";
					chartData = {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [{
							data: weatherList.map(w => useMiles ? w.precipitation * 0.03937 : w.precipitation),
							color: () => "#00BFFF",
							strokeWidth: 2,
						}],
					};
					break;
				case "Wind Speed":
					yAxisSuffix = useMiles ? "mph" : "m/s";
					chartData = {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [{
							data: weatherList.map(w => w.wind),
							color: () => "#FF8C00",
							strokeWidth: 2,
						}],
					};
					break;
				case "UV Index":
					yAxisSuffix = "";
					chartData = {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [{
							data: weatherList.map(w => w.uvIndex),
							color: () => "#9400D3",
							strokeWidth: 2,
						}],
					};
					break;
				case "Humidity":
					yAxisSuffix = useDewPoint ? "°C" : "%";
					chartData = {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [{
							data: weatherList.map(w => useDewPoint ? magnusDewPoint(w.temp, w.humidity) : w.humidity),
							color: () => "#1E90FF",
							strokeWidth: 2,
						}],
					};
					break;
				case "Cloud Cover":
					yAxisSuffix = "%";
					chartData = {
						labels: weatherList.map(w => w.date ? w.date.split("-")[0] : ""),
						datasets: [{
							data: weatherList.map(w => w.cloudCover),
							color: () => "#A9A9A9",
							strokeWidth: 2,
						}],
					};
					break;
			}
		}

		return (
			<View key={item.key} style={styles.rowContainer}>
				<View style={styles.row}>
					<Pressable onPress={() => toggleRow(item.key)} style={styles.iconTouch}>
						<Animated.View style={{ transform: [{ rotate }] }}>
							<AntDesign name="caret-right" size={20} color="black" />
						</Animated.View>
					</Pressable>

					<View style={{ flex: 1 }}>
						<Text style={styles.rowText}>
							{item.key}: {typeof item.value === "number" ? item.value.toFixed(1) : item.value}
							{item.details["Unit"] ? ` ${item.details["Unit"]}` : ""}
						</Text>
						{item.probability && (
							<Text style={styles.probabilityText}>
								Probability: {item.probability}
							</Text>
						)}
					</View>
				</View>

				{isExpanded && item.details && Object.keys(item.details).length > 0 && (
					<Animated.View style={[styles.detailsContainer, { opacity: fadeAnim }]}>
						{Object.entries(item.details).map(([k, v]) => (
							<Text key={k} style={styles.detailText}>
								{k}: {typeof v === "number" ? v.toFixed(1) : v}
							</Text>
						))}
						{showChart && chartData && (
							<View style={{ marginTop: 10, marginBottom: 5 }}>
								<Text style={{ fontSize: 15, marginBottom: 5, fontWeight: '600' }}>
									Yearly same-day {item.key} variation
								</Text>
								<LineChart
									data={chartData}
									width={chartWidth}
									height={Math.max(150, chartWidth * 0.35)}
									yAxisSuffix={yAxisSuffix}
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
					</Animated.View>
				)}
			</View>
		);
	}, [expandedRows, animationValues, toggleRow, weatherList, chartWidth, useFahrenheit, useMiles, useDewPoint, magnusDewPoint]);

	const toggleSettingsPanel = useCallback(() => {
		Animated.timing(settingsAnim, {
			toValue: settingsVisible ? 0 : 1,
			duration: 300,
			useNativeDriver: false,
		}).start();
		setSettingsVisible(!settingsVisible);
	}, [settingsAnim, settingsVisible]);

	const SettingsPanel = useMemo(() => {
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
					<Text>Use Dew Point</Text>
					<Switch value={useDewPoint} onValueChange={setUseDewPoint} />
				</View>
				<View style={styles.settingRow}>
					<Text>Use Imperial Units</Text>
					<Switch value={useMiles} onValueChange={setUseMiles} />
				</View>
				<View style={styles.settingRow}>
					<Text>Show Probabilities</Text>
					<Switch value={showProbabilities} onValueChange={setShowProbabilities} />
				</View>
				{startDate && endDate && (
					<View>
						<Text style={{ fontSize: 14, fontWeight: "500", color: "#0D47A1", marginBottom: 6 }}>
							Highlight day (from {startDate} to {endDate})
						</Text>
						<View style={{ borderWidth: 1, borderColor: "#90CAF9", borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
							<Picker
								selectedValue={highlightMetric}
								onValueChange={(val) => setHighlightMetric(val as HighlightMetric)}
								style={{
									color: "#0D47A1",
									paddingVertical: 10,
									paddingHorizontal: 10,
									backgroundColor: "#fff",
								}}
								dropdownIconColor="#0D47A1"
							>
								{highlightOptions.map(([label, value]) => (
									<Picker.Item key={value} label={label} value={value} />
								))}
							</Picker>
						</View>
					</View>
				)}
			</Animated.View>
		);
	}, [settingsAnim, useFahrenheit, useDewPoint, useMiles, showProbabilities, startDate, endDate, highlightMetric]);

	const btnBottom = settingsAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [btnHeight, btnPanelHeight],
	});

	if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

	return (
		<View style={{ flex: 1 }}>
			{/* Top bar with back button and action buttons */}
			<View style={{ position: "absolute", top: insets.top, right: 0, left: 0, zIndex: 9999, backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
				<TouchableOpacity
					style={styles.backBtn}
					onPress={() => router.push('/map')}
					activeOpacity={0.7}
				>
					<Ionicons name="arrow-back" size={24} color="#007AFF" />
				</TouchableOpacity>

				<View style={{ flexDirection: "row", gap: 10 }}>
					<TouchableOpacity
						style={styles.shareBtn}
						onPress={Platform.OS === "web" ? downloadJsonWeb : shareAsJson}
						activeOpacity={0.7}
					>
						<Text style={styles.shareText}>Export JSON</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.shareBtn}
						onPress={Platform.OS === "web" ? downloadScreenshotWeb : shareScreenshot}
						activeOpacity={0.7}
					>
						<Text style={styles.shareText}>Screenshot</Text>
					</TouchableOpacity>
				</View>
			</View>

			<SafeAreaView style={{ flex: 1, paddingTop: 60 }} ref={screenRef}>
				{Platform.OS === "web" ? (
					<div style={{ overflow: "auto", height: "100vh", padding: 10 }}>
						<View id="weather-container">
							<View style={{ marginBottom: 10, padding: 12, backgroundColor: '#E3F2FD', borderRadius: 12 }}>
								<Text style={{ fontSize: 20, fontWeight: "bold", color: "#0D47A1", marginBottom: 4 }}>
									Weather Data for <Text style={{ color: "#1976D2" }}>{targetDate}</Text>
								</Text>
								{startDate && endDate && (
									<Text style={{ fontSize: 14, color: "#1976D2", marginBottom: 4 }}>
										(Showing {highlightOptions.find(([_, value]) => value === highlightMetric)?.[0] || highlightMetric} day within {startDate} — {endDate})
									</Text>
								)}
								<Text style={{ fontSize: 14, color: "#0D47A1" }}>
									{location ? `Location: ${location}\n` : ""}
									Latitude: {targetLatitude}, Longitude: {targetLongitude}
								</Text>
								<Text style={{ fontSize: 12, color: "#666", marginTop: 6, fontStyle: 'italic' }}>
									Data based on {weatherList.length} years of NASA Earth observations
								</Text>
							</View>
							{rows.map((item) => renderRow(item))}
							<View style={{ height: settingsVisible ? btnPanelHeight + 20 : btnHeight + 20 }} />
						</View>
					</div>
				) : (
					<ScrollView
						style={{ flex: 1, minHeight: 0, padding: 10 }}
						contentContainerStyle={{ paddingBottom: 50 }}
						removeClippedSubviews={true}
					>
						<View
							id="weather-container"
							style={{
								padding: 12,
								borderRadius: 12,
								backgroundColor: "#E3F2FD",
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.1,
								shadowRadius: 4,
								elevation: 3,
								marginBottom: 10,
							}}
						>
							<Text style={{ fontSize: 20, fontWeight: "bold", color: "#0D47A1", marginBottom: 4 }}>
								Weather Data for <Text style={{ color: "#1976D2" }}>{targetDate}</Text>
							</Text>
							{startDate && endDate && (
								<Text style={{ fontSize: 14, color: "#1976D2", marginBottom: 4 }}>
									(Showing {highlightOptions.find(([_, value]) => value === highlightMetric)?.[0] || highlightMetric} day)
								</Text>
							)}
							<Text style={{ fontSize: 14, color: "#0D47A1" }}>
								Latitude: {Number(targetLatitude).toFixed(3)}, Longitude: {Number(targetLongitude).toFixed(3)}
								{location ? `\nLocation: ${location}` : ""}
							</Text>
							<Text style={{ fontSize: 12, color: "#666", marginTop: 6, fontStyle: 'italic' }}>
								Based on {weatherList.length} years of NASA data
							</Text>
						</View>
						{rows.map((item) => renderRow(item))}
						<View style={{ height: settingsVisible ? btnPanelHeight + 20 : btnHeight + 20 }} />
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
							{settingsVisible ? "Hide Settings" : "Show Settings"}
						</Text>
					</TouchableOpacity>
				</Animated.View>

				{SettingsPanel}
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
		fontWeight: '500',
	},
	probabilityText: {
		fontSize: 13,
		marginLeft: 5,
		marginTop: 4,
		color: "#0D47A1",
		fontStyle: 'italic',
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
	backBtn: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: "#f0f0f0",
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
		paddingTop: 10,
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