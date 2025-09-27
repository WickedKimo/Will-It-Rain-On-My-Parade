// app/date_choosing.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Button, Text, View } from "react-native";

export default function DateChoosingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // <- fixed here
  const { lat, lng } = params as { lat: string; lng: string };

  const [selectedDate, setSelectedDate] = useState("2025-09-28");

  const handleConfirm = () => {
    router.push({
      pathname: "/show_weather",
      params: {
        lat,
        lng,
        date: selectedDate,
      },
    });
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text>選擇的座標:</Text>
      <Text>緯度: {lat}, 經度: {lng}</Text>
      <Text>選擇日期: {selectedDate}</Text>

      <Button title="確認日期並查看天氣" onPress={handleConfirm} />
    </View>
  );
}
