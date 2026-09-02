# AI Trading Simulator Mobile

This folder contains the Expo app for iPhone and Android.

## Setup

1. Install dependencies.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
3. Start the app with `npm start`.

## iPhone and Android with Expo Go

This project uses **Expo SDK 54**, which is fully compatible with your **Expo Go (SDK 54.0.0)** app from the App Store and Google Play.

1. Open **Expo Go** on your phone.
2. Run `npm start` (or `npm run dev:mobile` from the root) in the `mobile` folder.
3. Scan the QR code in your Expo Go app.

## Example API URLs

- Local emulator or simulator: `http://127.0.0.1:8000`
- Same Wi-Fi phone testing: `http://10.233.159.17:8000`
- Tunnel testing: use the tunnel URL for the backend service

## What it includes

- Landing screen
- Login and register screens
- Dashboard with live portfolio and market snapshot
