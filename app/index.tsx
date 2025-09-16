// app/index.tsx
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const [selectMode, setSelectMode] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const webviewRef = useRef<any>(null);
  const router = useRouter();
  
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([23.97, 120.97], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          attribution:'© OpenStreetMap contributors'
        }).addTo(map);
        
        var selectMode = false;
        var marker = null;
        
        window.toggleSelect = function() { 
          selectMode = !selectMode; 
          document.getElementById('map').style.cursor = selectMode ? 'default' : 'grab';
        }
        
        map.on('click', function(e){
          if(!selectMode) return;
          
          const data = { lat: e.latlng.lat, lng: e.latlng.lng };
          
          if(marker){
            map.removeLayer(marker);
          }
          
          marker = L.circleMarker([data.lat, data.lng], {
            radius: 3,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 1
          }).addTo(map);
          
          if(window.ReactNativeWebView){
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          } else {
            parent.postMessage(JSON.stringify(data), '*');
          }
          
          window.toggleSelect()
        });
        
        document.getElementById('map').style.cursor = 'grab';
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data);
      if (data.lat && data.lng) {
        setCoords({ lat: data.lat, lng: data.lng });
        setSelectMode(false);
      }
    } catch (e) {}
  };

  const handleConfirm = () => {
    if (!coords) return;
    router.push({
      pathname: "/date_choosing",
      params: { lat: coords.lat, lng: coords.lng },
    });
  };

  return (
    <View style={styles.container}>
      <Button
        title={selectMode ? "取消選擇位置" : "選擇地圖位置"}
        onPress={() => {
          setSelectMode(!selectMode);
          if (Platform.OS !== "web") {
            webviewRef.current?.injectJavaScript(`window.toggleSelect();`);
          } else {
            const iframe: any = document.getElementById("mapframe");
            iframe.contentWindow.toggleSelect?.();
          }
        }}
      />

      {coords && (
        <View style={styles.confirmContainer}>
          <Text style={{ marginRight: 10 }}>
            經度: {coords.lng.toFixed(3)}, 緯度: {coords.lat.toFixed(3)}
          </Text>
          <Button title="確認" onPress={handleConfirm} />
        </View>
      )}

      <View style={styles.mapContainer}>
        {Platform.OS === "web" ? (
          <iframe
            id="mapframe"
            srcDoc={mapHtml}
            style={styles.map}
            onLoad={() => {
              window.addEventListener("message", handleMessage);
            }}
          />
        ) : (
          <Text>手機端可用 WebView 顯示地圖</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  mapContainer: { flex: 1, marginTop: 10 },
  map: { width: "100%", height: "100%" },
  confirmContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
});
