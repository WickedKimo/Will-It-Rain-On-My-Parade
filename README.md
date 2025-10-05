# Will It Rain On My Parade? 🌦️

**NASA Space Apps Challenge 2025 - Challenge 19**

A mobile application that leverages NASA MERRA-2 radiation diagnostic data to provide accurate precipitation forecasts and help users plan outdoor activities with confidence.

## 📋 Challenge Overview

This project addresses the [NASA Space Apps Challenge 2025: "Will It Rain On My Parade?"](https://www.spaceappschallenge.org/2025/challenges/will-it-rain-on-my-parade/) challenge. The goal is to utilize NASA's satellite and atmospheric data to create an accessible tool for precipitation prediction and weather visualization.

## 🎯 Problem Statement

Planning outdoor events, parades, and activities is challenging when weather conditions are uncertain. Traditional weather apps often lack detailed localized data or fail to present NASA's comprehensive atmospheric datasets in an accessible format. Our solution bridges this gap by processing MERRA-2 data to deliver intuitive, location-based precipitation forecasts.

## 🛰️ Data Sources

Our application integrates data from two complementary MERRA-2 datasets to provide comprehensive precipitation forecasting:

### 1. M2T1NXFLX - Surface Flux Diagnostics V5.12.4

**MERRA-2 Tavg1_2d_flx_Nx: 2d,1-Hourly,Time-Averaged,Single-Level,Assimilation,Surface Flux Diagnostics**

- **Source**: [NASA GES DISC - M2T1NXFLX](https://disc.gsfc.nasa.gov/datasets/M2T1NXFLX_5.12.4/summary)
- **Temporal Resolution**: 1-hourly
- **Spatial Resolution**: 0.5° × 0.625° (latitude × longitude)

**Variables Used:**
- `SPEED` - Surface wind speed
- `TLML` - Surface air temperature
- `QSH` - Effective surface specific humidity
- `PRECTOT` - Total precipitation
- `PRECSNO` - Snowfall

### 2. M2T1NXRAD - Radiation Diagnostics V5.12.4

**MERRA-2 Tavg1_2d_rad_Nx: 2d,1-Hourly,Time-Averaged,Single-Level,Assimilation,Radiation Diagnostics**

- **Source**: [NASA GES DISC - M2T1NXRAD](https://disc.gsfc.nasa.gov/datasets/M2T1NXRAD_5.12.4/summary)
- **Temporal Resolution**: 1-hourly
- **Spatial Resolution**: 0.5° × 0.625° (latitude × longitude)

**Variables Used:**
- `TAUTOT` - In-cloud optical thickness of all clouds

### Data Processing Approach

- Pre-downloaded datasets from both M2T1NXFLX and M2T1NXRAD are stored locally
- Offline-first architecture ensures data availability without constant internet connectivity
- Local data reading enables faster query responses and reduced bandwidth requirements
- Combined analysis of surface flux and radiation diagnostics provides comprehensive weather assessment

## ✨ Features

### 📍 Location-Based Weather Forecasting
- Utilizes device GPS to provide location-specific precipitation predictions
- Interactive map visualization powered by `react-native-maps`

### 📊 Data Visualization
- Chart-based precipitation trends using `react-native-chart-kit`
- Multi-variable weather analysis combining:
   - Total precipitation (PRECTOT) and snowfall (PRECSNO)
   - Surface temperature (TLML) and wind speed (SPEED)
   - Cloud optical thickness (TAUTOT) for cloud cover assessment
   - Surface humidity (QSH) for comprehensive weather patterns
- Historical and forecasted precipitation data display

### 💾 Offline Capability
- Local data storage using `@react-native-async-storage/async-storage`
- Pre-loaded M2T1NXFLX and M2T1NXRAD datasets enable offline usage
- No dependency on real-time API calls for core functionality

### 🎨 User Interface
- Native mobile experience built with React Native
- Intuitive navigation with bottom tab structure
- Haptic feedback for enhanced user interaction
- Screenshot sharing functionality via `react-native-view-shot`

## 🏗️ Technical Architecture

### Framework & Platform
- **Framework**: Expo SDK 54
- **Language**: TypeScript
- **Platform**: Cross-platform (iOS, Android, Web)
- **Routing**: File-based routing with Expo Router

### Key Dependencies

```json
{
  "react-native": "0.81.4",
  "expo": "~54.0.7",
  "react-native-maps": "^1.26.9",
  "react-native-chart-kit": "^6.12.0",
  "expo-location": "^19.0.7",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "react-native-svg": "^15.12.1"
}
```

### Architecture Highlights
- **File-based routing**: Organized screen structure in `/app` directory
- **Dual-dataset integration**: Combines surface flux and radiation diagnostics for accurate forecasting
- **Local data management**: Efficient reading and caching of M2T1NXFLX and M2T1NXRAD datasets
- **Reactive UI**: State management with React hooks
- **Vector graphics**: SVG support for crisp visualization rendering

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Expo CLI (optional but recommended)
- iOS Simulator (for macOS) or Android Emulator

### Installation

1. Clone the repository:
```bash
git clone https://github.com/WickedKimo/Will-It-Rain-On-My-Parade.git
cd Will-It-Rain-On-My-Parade
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or
npx expo start
```

4. Run on your preferred platform:
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## 📱 Platform Support

- **iOS**: Full support with native map and location features
- **Android**: Complete functionality with Android-specific optimizations
- **Web**: Basic web support for broader accessibility

## 🔧 Development Scripts

```bash
npm start          # Start Expo development server
npm run android    # Launch on Android emulator
npm run ios        # Launch on iOS simulator
npm run web        # Launch in web browser
npm run lint       # Run ESLint code quality checks
```

## 📂 Project Structure

```
Will-It-Rain-On-My-Parade/
├── app/                    # Application screens and routing
├── assets/                 # Static assets (images, fonts, data files)
├── components/             # Reusable React components
├── constants/              # Application constants and configuration
├── scripts/                # Utility scripts
└── package.json           # Project dependencies and metadata
```

## 🎓 NASA Space Apps Challenge

This project was developed for the NASA Space Apps Challenge 2025, a global hackathon focused on utilizing NASA's open data to solve real-world challenges. The "Will It Rain On My Parade?" challenge specifically addresses the need for accessible, accurate precipitation forecasting using satellite and atmospheric data.

### Challenge Goals Addressed
✅ Utilize NASA MERRA-2 surface flux diagnostics (M2T1NXFLX) for weather variables  
✅ Integrate radiation diagnostics (M2T1NXRAD) for cloud analysis  
✅ Provide location-based precipitation forecasts using multiple meteorological parameters  
✅ Create an intuitive mobile interface for complex weather data  
✅ Enable offline data access for reliability  
✅ Visualize multi-variable atmospheric data in an understandable format

## 📄 License

This project is created for the NASA Space Apps Challenge 2025.

## 🔗 Resources

- [NASA Space Apps Challenge](https://www.spaceappschallenge.org/)
- [MERRA-2 M2T1NXFLX Dataset](https://disc.gsfc.nasa.gov/datasets/M2T1NXFLX_5.12.4/summary)
- [MERRA-2 M2T1NXRAD Dataset](https://disc.gsfc.nasa.gov/datasets/M2T1NXRAD_5.12.4/summary)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)

## 👥 Team

**Project Repository**: [Will-It-Rain-On-My-Parade](https://github.com/WickedKimo/Will-It-Rain-On-My-Parade)

---

*Built with NASA data and ❤️ for the Space Apps Challenge 2025*