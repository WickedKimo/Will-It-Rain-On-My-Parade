// map.tsx - Enhanced version with date selection and search suggestions
import React, { useRef, useState, useEffect } from "react";
import { Button, Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from "expo-router";
import * as Location from 'expo-location';

interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
}

interface SearchSuggestion {
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
}

export default function Map() {
    const [selectMode, setSelectMode] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [searchText, setSearchText] = useState('');
    const [userLocation, setUserLocation] = useState<LocationData | null>(null);
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const webviewRef = useRef<any>(null);
    const router = useRouter();

    // Request location permission
    useEffect(() => {
        getCurrentLocation();
    }, []);

    // Search suggestions debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchText.trim().length > 2) {
                fetchSearchSuggestions(searchText);
            } else {
                setSearchSuggestions([]);
                setShowSuggestions(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchText]);

    const getCurrentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('權限被拒絕', '需要位置權限才能使用定位功能');
                setUserLocation({
                    latitude: 25.0330,
                    longitude: 121.5654
                });
                return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const locationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };
            setUserLocation(locationData);
        } catch (error) {
            console.error('獲取位置失敗:', error);
            setUserLocation({
                latitude: 25.0330,
                longitude: 121.5654
            });
        }
    };

    // Fetch search suggestions
    const fetchSearchSuggestions = async (query: string) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=zh-TW,zh,en`
            );
            const results = await response.json();
            setSearchSuggestions(results);
            setShowSuggestions(results.length > 0);
        } catch (error) {
            console.error('Search suggestions error:', error);
        }
    };

    // Enhanced map HTML with date selection
    const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <style>
        html,body,#map{margin:0;padding:0;width:100%;height:100%;}
        
        .location-popup {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          z-index: 1000;
          transform: translateY(calc(100% + 20px));  /* 完全移出螢幕外 + 額外 20px */
          pointer-events: none
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 90vw;
          margin: 0 auto;
          max-height: 70vh;
          overflow-y: auto;
        }
        
        .location-popup.show {
          transform: translateY(0);
        }
        
        .popup-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .popup-coords {
          font-family: monospace;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .popup-address {
          font-size: 14px;
          color: #555;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .date-section {
          margin: 16px 0;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .date-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-mode-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .date-mode-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .date-mode-btn.active {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .date-inputs {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .date-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .date-label {
          font-size: 13px;
          font-weight: 500;
          color: #555;
        }

        .date-input {
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 15px;
          background: white;
          color: #333;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .date-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .popup-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        
        .popup-btn {
          flex: 1;
          padding: 14px 16px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-clear {
          background: #f0f0f0;
          color: #666;
        }

        .btn-clear:active {
          background: #e0e0e0;
        }
        
        .btn-weather {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-weather:active {
          opacity: 0.8;
        }

        .btn-weather:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          color: #e74c3c;
          font-size: 13px;
          margin-top: 6px;
        }

        /* Custom marker styles */
        .custom-marker {
          width: 20px;
          height: 20px;
          background: #FF4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        }

        .user-marker {
          width: 16px;
          height: 16px;
          background: #007AFF;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      
      <div class="location-popup" id="locationPopup">
        <div class="popup-title">
          <span>📍</span>
          <span>選擇的位置</span>
        </div>
        <div class="popup-coords" id="popupCoords"></div>
        <div class="popup-address" id="popupAddress"></div>
        
        <div class="date-section">
          <div class="date-section-title">
            <span>📅</span>
            <span>選擇查詢日期</span>
          </div>
          
          <div class="date-mode-buttons">
            <button class="date-mode-btn active" id="singleDateBtn" onclick="setDateMode('single')">
              單一日期
            </button>
            <button class="date-mode-btn" id="rangeDateBtn" onclick="setDateMode('range')">
              日期區間
            </button>
          </div>
          
          <div class="date-inputs">
            <div class="date-input-group" id="singleDateGroup">
              <label class="date-label">選擇日期</label>
              <input type="date" class="date-input" id="singleDate" onchange="validateDates()">
            </div>
            
            <div class="date-input-group" id="startDateGroup" style="display: none;">
              <label class="date-label">開始日期</label>
              <input type="date" class="date-input" id="startDate" onchange="validateDates()">
            </div>
            
            <div class="date-input-group" id="endDateGroup" style="display: none;">
              <label class="date-label">結束日期</label>
              <input type="date" class="date-input" id="endDate" onchange="validateDates()">
            </div>
            
            <div class="error-message" id="dateError" style="display: none;"></div>
          </div>
        </div>
        
        <div class="popup-buttons">
          <button class="popup-btn btn-clear" onclick="clearSelection()">清除</button>
          <button class="popup-btn btn-weather" id="weatherBtn" onclick="checkWeather()">查看天氣</button>
        </div>
      </div>

      <script>
        var map = L.map('map').setView([${userLocation?.latitude || 25.0330}, ${userLocation?.longitude || 121.5654}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          attribution:'© OpenStreetMap contributors'
        }).addTo(map);
        
        var selectMode = false;
        var marker = null;
        var userMarker = null;
        var selectedLocation = null;
        var dateMode = 'single';
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('singleDate').min = today;
        document.getElementById('startDate').min = today;
        document.getElementById('endDate').min = today;
        
        // Add user location marker
        function addUserLocationMarker(lat, lng) {
          if (userMarker) {
            map.removeLayer(userMarker);
          }
          
          var userIcon = L.divIcon({
            html: '<div class="user-marker"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            className: 'custom-user-icon'
          });
          
          userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
        }
        
        // Add initial user marker
        addUserLocationMarker(${userLocation?.latitude || 25.0330}, ${userLocation?.longitude || 121.5654});
        
        window.toggleSelect = function() { 
          selectMode = !selectMode; 
          document.getElementById('map').style.cursor = selectMode ? 'crosshair' : 'grab';
        }
        
        // Date mode selection
        window.setDateMode = function(mode) {
          dateMode = mode;
          
          document.getElementById('singleDateBtn').classList.toggle('active', mode === 'single');
          document.getElementById('rangeDateBtn').classList.toggle('active', mode === 'range');
          
          document.getElementById('singleDateGroup').style.display = mode === 'single' ? 'flex' : 'none';
          document.getElementById('startDateGroup').style.display = mode === 'range' ? 'flex' : 'none';
          document.getElementById('endDateGroup').style.display = mode === 'range' ? 'flex' : 'none';
          
          validateDates();
        };
        
        // Validate dates
        window.validateDates = function() {
          const errorDiv = document.getElementById('dateError');
          const weatherBtn = document.getElementById('weatherBtn');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let isValid = true;
          let errorMsg = '';
          
          if (dateMode === 'single') {
            const singleDate = document.getElementById('singleDate').value;
            if (!singleDate) {
              isValid = false;
              errorMsg = '請選擇日期';
            } else {
              const selectedDate = new Date(singleDate);
              if (selectedDate < today) {
                isValid = false;
                errorMsg = '不能選擇過去的日期';
              }
            }
          } else {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (!startDate || !endDate) {
              isValid = false;
              errorMsg = '請選擇開始和結束日期';
            } else {
              const start = new Date(startDate);
              const end = new Date(endDate);
              
              if (start < today) {
                isValid = false;
                errorMsg = '開始日期不能是過去的日期';
              } else if (end < start) {
                isValid = false;
                errorMsg = '結束日期不能早於開始日期';
              }
            }
          }
          
          if (errorMsg) {
            errorDiv.textContent = errorMsg;
            errorDiv.style.display = 'block';
          } else {
            errorDiv.style.display = 'none';
          }
          
          weatherBtn.disabled = !isValid;
          return isValid;
        };
        
        // Enhanced map click handler
        map.on('click', function(e){
          if(!selectMode) return;
          
          const data = { lat: e.latlng.lat, lng: e.latlng.lng };
          
          if(marker){
            map.removeLayer(marker);
          }
          
          var icon = L.divIcon({
            html: '<div class="custom-marker"></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            className: 'custom-selection-icon'
          });
          
          marker = L.marker([data.lat, data.lng], { icon: icon }).addTo(map);
          
          // Store selected location
          selectedLocation = { latitude: data.lat, longitude: data.lng };
          
          // Show popup with coordinates
          showLocationPopup(data.lat, data.lng);
          
          // Reverse geocoding
          reverseGeocode(data.lat, data.lng);
          
          if(window.ReactNativeWebView){
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          } else {
            parent.postMessage(JSON.stringify(data), '*');
          }
          
          window.toggleSelect();
        });
        
        // Show location popup
        function showLocationPopup(lat, lng) {
          document.getElementById('popupCoords').textContent = 
            \`緯度: \${lat.toFixed(6)} | 經度: \${lng.toFixed(6)}\`;
          document.getElementById('popupAddress').textContent = '正在獲取地址...';
          document.getElementById('locationPopup').classList.add('show');
          validateDates();
        }
        
        // Reverse geocoding
        async function reverseGeocode(lat, lng) {
          try {
            const response = await fetch(
              \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&addressdetails=1&accept-language=zh-TW,zh,en\`
            );
            const data = await response.json();
            
            if (data && data.display_name) {
              const address = data.display_name;
              document.getElementById('popupAddress').textContent = address;
              selectedLocation.address = address;
            } else {
              document.getElementById('popupAddress').textContent = '無法獲取地址資訊';
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            document.getElementById('popupAddress').textContent = '地址獲取失敗';
          }
        }
        
        // Clear selection
        window.clearSelection = function() {
          if (marker) {
            map.removeLayer(marker);
            marker = null;
          }
          selectedLocation = null;
          document.getElementById('locationPopup').classList.remove('show');
          
          // Reset dates
          document.getElementById('singleDate').value = '';
          document.getElementById('startDate').value = '';
          document.getElementById('endDate').value = '';
          document.getElementById('dateError').style.display = 'none';
        };
        
        // Check weather
        window.checkWeather = function() {
          if (!validateDates() || !selectedLocation) return;
          
          var weatherData = {
            type: 'checkWeather',
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            address: selectedLocation.address,
            dateMode: dateMode
          };
          
          if (dateMode === 'single') {
            weatherData.date = document.getElementById('singleDate').value;
          } else {
            weatherData.startDate = document.getElementById('startDate').value;
            weatherData.endDate = document.getElementById('endDate').value;
          }
          
          if(window.ReactNativeWebView){
            window.ReactNativeWebView.postMessage(JSON.stringify(weatherData));
          } else {
            parent.postMessage(JSON.stringify(weatherData), '*');
          }
        };
        
        // Search location
        window.searchLocation = async function(query) {
          if (!query.trim()) return;
          
          try {
            // Check coordinate format
            const coordMatch = query.match(/^(-?\\d+\\.?\\d*),\\s*(-?\\d+\\.?\\d*)$/);
            if (coordMatch) {
              const lat = parseFloat(coordMatch[1]);
              const lng = parseFloat(coordMatch[2]);
              
              if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                map.setView([lat, lng], 15);
                var clickEvent = { latlng: { lat: lat, lng: lng } };
                selectMode = true;
                map.fire('click', clickEvent);
                return;
              }
            }
            
            // Address search
            const response = await fetch(
              \`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(query)}&limit=1&accept-language=zh-TW,zh,en\`
            );
            const results = await response.json();
            
            if (results.length > 0) {
              const result = results[0];
              const lat = parseFloat(result.lat);
              const lng = parseFloat(result.lon);
              
              map.setView([lat, lng], 15);
              var clickEvent = { latlng: { lat: lat, lng: lng } };
              selectMode = true;
              map.fire('click', clickEvent);
            } else {
              var errorData = {
                type: 'searchError',
                message: '找不到該地址'
              };
              if(window.ReactNativeWebView){
                window.ReactNativeWebView.postMessage(JSON.stringify(errorData));
              } else {
                parent.postMessage(JSON.stringify(errorData), '*');
              }
            }
          } catch (error) {
            var errorData = {
              type: 'searchError',
              message: '搜索時發生錯誤'
            };
            if(window.ReactNativeWebView){
              window.ReactNativeWebView.postMessage(JSON.stringify(errorData));
            } else {
              parent.postMessage(JSON.stringify(errorData), '*');
            }
          }
        };
        
        // Go to user location
        window.goToUserLocation = function(lat, lng) {
          if (lat && lng) {
            map.setView([lat, lng], 15);
            addUserLocationMarker(lat, lng);
          }
        };
        
        document.getElementById('map').style.cursor = 'grab';
      </script>
    </body>
    </html>
  `;

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent?.data || event.data);

            if (data.type === 'checkWeather') {
                // Prepare location string for display
                const locationString = data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`;

                // Prepare parameters to send to weather page
                const params: any = {
                    location: locationString,
                    latitude: data.latitude.toString(),
                    longitude: data.longitude.toString(),
                    dateMode: data.dateMode || 'single'
                };

                // Add date information based on mode
                if (data.dateMode === 'single') {
                    params.date = data.date;
                    console.log('Sending single date:', data.date);
                } else if (data.dateMode === 'range') {
                    params.startDate = data.startDate;
                    params.endDate = data.endDate;
                    console.log('Sending date range:', data.startDate, 'to', data.endDate);
                }

                // Log all parameters being sent
                console.log('Navigating to weather with params:', params);

                // Navigate to weather page with all parameters
                router.push({
                    pathname: "/weather" as any,
                    params: params,
                });
            } else if (data.type === 'searchError') {
                Alert.alert('搜索錯誤', data.message);
            } else if (data.lat && data.lng) {
                setCoords({ lat: data.lat, lng: data.lng });
                setSelectMode(false);
            }
        } catch (e) {
            console.error('Message parsing error:', e);
        }
    };

    const handleSearch = () => {
        if (searchText.trim()) {
            setShowSuggestions(false);
            if (Platform.OS !== "web") {
                webviewRef.current?.injectJavaScript(`window.searchLocation('${searchText.replace(/'/g, "\\'")}');`);
            } else {
                const iframe: any = document.getElementById("mapframe");
                iframe.contentWindow.searchLocation?.(searchText);
            }
        }
    };

    const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
        setSearchText(suggestion.display_name);
        setShowSuggestions(false);

        if (Platform.OS !== "web") {
            webviewRef.current?.injectJavaScript(`window.searchLocation('${suggestion.display_name.replace(/'/g, "\\'")}');`);
        } else {
            const iframe: any = document.getElementById("mapframe");
            iframe.contentWindow.searchLocation?.(suggestion.display_name);
        }
    };

    const goToUserLocation = () => {
        if (userLocation) {
            if (Platform.OS !== "web") {
                webviewRef.current?.injectJavaScript(`window.goToUserLocation(${userLocation.latitude}, ${userLocation.longitude});`);
            } else {
                const iframe: any = document.getElementById("mapframe");
                iframe.contentWindow.goToUserLocation?.(userLocation.latitude, userLocation.longitude);
            }
        } else {
            getCurrentLocation();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <View style={styles.container}>
                {/* Enhanced top controls */}
                <View style={styles.topControls}>
                    <View style={styles.searchWrapper}>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="搜尋地點或輸入座標..."
                                placeholderTextColor="#999"
                                value={searchText}
                                onChangeText={setSearchText}
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={handleSearch}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.searchButtonText}>🔍</Text>
                            </TouchableOpacity>
                        </View>

                        {showSuggestions && searchSuggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <ScrollView
                                    style={styles.suggestionsList}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {searchSuggestions.map((suggestion) => (
                                        <TouchableOpacity
                                            key={suggestion.place_id}
                                            style={styles.suggestionItem}
                                            onPress={() => handleSuggestionSelect(suggestion)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.suggestionIcon}>📍</Text>
                                            <Text
                                                style={styles.suggestionText}
                                                numberOfLines={2}
                                            >
                                                {suggestion.display_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.locationButton}
                        onPress={goToUserLocation}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.locationButtonText}>📍</Text>
                    </TouchableOpacity>
                </View>

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
                        <WebView
                            ref={webviewRef}
                            source={{ html: mapHtml }}
                            style={styles.map}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            onMessage={handleMessage}
                            onError={(error) => {
                                console.error('WebView error:', error);
                                Alert.alert('載入錯誤', '地圖載入失敗,請檢查網路連線');
                            }}
                            startInLoadingState={true}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                            mixedContentMode="compatibility"
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f5f5f5'
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 10,
        zIndex: 1000,
    },
    searchWrapper: {
        flex: 1,
        position: 'relative',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    searchButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#667eea',
        margin: 2,
    },
    searchButtonText: {
        fontSize: 16,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        maxHeight: 250,
        overflow: 'hidden',
    },
    suggestionsList: {
        maxHeight: 250,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    suggestionText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    locationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    locationButtonText: {
        fontSize: 16,
    },
    mapContainer: {
        flex: 1,
        marginTop: 10,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    map: {
        width: "100%",
        height: "100%"
    },
});