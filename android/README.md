# MEYRA AI - Native Android Application

Native Android client for **MEYRA AI**, built with **Kotlin**, **Jetpack Compose**, and **Material 3**.

---

## 📱 Features

- **Futuristic MEYRA AI UI**: Dark theme by default, styled with MEYRA brand indigo/violet gradients, and smooth typography.
- **Home Screen**:
  - MEYRA AI branding & emblem
  - Welcome text: *"MEYRA AI"*
  - Subtitle: *"Your Intelligent AI Companion"*
  - 3 Suggestion Cards:
    1. *Explain something*
    2. *Help me write*
    3. *Help me code*
- **Chat Experience**:
  - User messages on the right
  - AI messages on the left with formatted Markdown and code blocks
  - Real-time SSE token streaming and non-streaming fallback
  - Animated typing/thinking indicator
  - Automatic scrolling to newest message
  - Send button + Keyboard `ImeAction.Send` action
  - Send disabled while processing
  - Clean error banners with a **Retry** button
  - Copy to clipboard for any AI response or code snippet
- **Conversations**:
  - Top bar **New Chat** button to start a new conversation
  - In-memory conversation state persistence while the app is active
- **Security & Architecture**:
  - **Zero secrets or API keys stored in the Android app**: All Gemini API keys remain strictly server-side on your Cloud Run backend.
  - OkHttp repository layer with Coroutines & StateFlow.
  - Network timeout, offline state, and HTTP error code handling (401, 403, 429, 500, 503).
  - Built-in **Backend Settings Dialog** to test connectivity or switch between your Cloud Run URL and local development host.

---

## 🚀 How to Open and Run

### Option 1: Android Studio (Recommended)
1. Open **Android Studio** (Ladybug / Hedgehog or newer).
2. Choose **Open Project** and select the `/android` directory.
3. Allow Gradle to sync dependencies.
4. Connect an Android phone (via USB with USB Debugging enabled) or start an Android Emulator.
5. Click the green **Run (Shift+F10)** button.

### Option 2: Command Line (Gradle)
```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

To install directly to a connected phone:
```bash
./gradlew installDebug
```

---

## 🌐 Backend Configuration

By default, the Android app connects to:
- Default: `https://meyra-ai-804674901589.asia-southeast1.run.app`

To change the backend endpoint:
1. Tap the **Settings (gear)** icon in the top right of the Android app bar.
2. Enter your Cloud Run backend URL (or `http://10.0.2.2:3000` for Android Emulator local testing).
3. Tap **Save**.
