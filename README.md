# MEYRA AI - Your Intelligent AI Companion

![MEYRA AI Logo](https://img.shields.io/badge/MEYRA%20AI-v1.0.0-06b6d4?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=for-the-badge&logo=vite)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=for-the-badge&logo=tailwindcss)

**MEYRA AI** is a complete, production-ready full-stack AI chat application built with a modern futuristic design, real-time streaming token generation, server-side API security, full Markdown & code highlighting, rich chat history management, and modular persistence.

---

## ✨ Features

- **Futuristic Cyber-Glass UI**: High-contrast dark theme by default with light mode toggle, frosted glass elements, and custom M-geometry vector brand logo.
- **Real-Time Streaming**: Live token streaming via Server-Sent Events (SSE) from the backend.
- **Markdown & Syntax Highlighting**: Full Markdown support (headers, lists, tables, blockquotes) and code blocks with syntax styling and one-click copy buttons.
- **Smart Conversations**: Grouped chronological history (Today, Yesterday, Previous 7 Days, Older), inline rename, delete confirmation, and auto-title generation.
- **Zero Client Secret Exposure**: All AI interactions and API keys stay exclusively on the Node.js Express backend.
- **Modular Storage Layer**: Pluggable storage architecture (`IChatStorage`) with local storage persistence, JSON backup export, and import support.
- **Rich Settings & Pages**: Theme switcher, temperature sliders, custom system prompts, account customization, and dedicated Privacy Policy & Terms of Service views.

---

## 📁 Project Structure

```
/
├── server/
│   ├── routes/
│   │   └── chat.ts            # POST /api/chat, GET /api/status, POST /api/title
│   └── services/
│       └── aiProvider.ts      # Google Gen AI SDK integration & modular provider
├── src/
│   ├── components/
│   │   ├── brand/             # MEYRA AI Logo & Brand components
│   │   ├── chat/              # ChatArea, WelcomeScreen, MessageItem, CodeBlock, MarkdownRenderer, Composer
│   │   ├── modals/            # Settings, Privacy, Terms, Contact, Rename, Delete modals
│   │   ├── navigation/        # Top navigation bar
│   │   └── sidebar/           # Sidebar, Conversation list & search
│   ├── hooks/
│   │   ├── useChat.ts         # Central chat state, streaming & abort controllers
│   │   └── useTheme.ts        # Dark / Light / System theme manager
│   ├── services/
│   │   ├── api.ts             # Client API service with SSE reader
│   │   └── storage.ts         # Modular IChatStorage implementation
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces (Message, Conversation, Settings)
│   ├── App.tsx                # Main App shell
│   ├── main.tsx               # Client entry point
│   └── index.css              # Tailwind CSS & custom styling
├── server.ts                  # Express backend & Vite middleware server
├── .env.example               # Environment variables template
├── package.json               # NPM dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
└── README.md                  # Setup & execution guide
```

---

## 🚀 Quick Start Guide (VS Code / Local Development)

Follow these steps to run MEYRA AI on your local machine:

### 1. Install Node.js
Ensure you have **Node.js v18.0.0 or higher** installed.
- Check version in your terminal:
  ```bash
  node -v
  npm -v
  ```
- If you don't have Node.js, download it from [nodejs.org](https://nodejs.org/).

---

### 2. Open the Project in VS Code
1. Open Visual Studio Code.
2. Click **File > Open Folder...** (or `Cmd+O` on macOS / `Ctrl+O` on Windows/Linux).
3. Select the extracted/downloaded project folder.
4. Open the integrated terminal in VS Code using `Ctrl + \`` (or **Terminal > New Terminal**).

---

### 3. Install Dependencies
Run the following command in the project root:

```bash
npm install
```

---

### 4. Create and Configure `.env` File
Create a `.env` file in the root directory by copying the example file:

**On macOS / Linux:**
```bash
cp .env.example .env
```

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

Open `.env` in VS Code and insert your Gemini API Key:

```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
PORT=3000
```

> 💡 **Where to get a free API Key**: Obtain a key in seconds from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

### 5. Start the Development Server
Start the full-stack dev server:

```bash
npm run dev
```

Your app will start on:
👉 **`http://localhost:3000`**

Open this URL in your web browser to start chatting with MEYRA AI.

---

### 6. Production Build & Start

To build and test the production-ready bundled version:

```bash
# 1. Build client static assets and bundle backend
npm run build

# 2. Start the production server
npm start
```

---

## 🔒 Security Architecture

1. **No Keys in Client Bundles**: The frontend never has access to `GEMINI_API_KEY` or `AI_API_KEY`.
2. **Server Proxying**: All user prompts are validated and proxied through `POST /api/chat`.
3. **Safe Rendering**: All Markdown and user inputs are parsed safely via `react-markdown` and `remark-gfm`.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Express + Vite development server on port 3000 |
| `npm run build` | Builds Vite frontend into `dist/` and bundles `server.ts` with esbuild |
| `npm start` | Launches the compiled production server (`dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans previous build artifacts |

---

## 📄 License
MIT License. Created with Google AI Studio & Antigravity.
