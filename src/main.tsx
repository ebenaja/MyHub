
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeDatabase } from "./services/database";

async function bootstrap() {
  try {
    await initializeDatabase();

    console.log("MyHub Database Ready");

    ReactDOM.createRoot(
      document.getElementById("root") as HTMLElement
    ).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Database initialization failed:", error);

    const root = document.getElementById("root");

    if (root) {
      root.innerHTML = `
        <div style="padding: 30px; color: #ff6b6b; font-family: sans-serif;">
          <h2>MyHub Database Error</h2>
          <p>Database gagal diinisialisasi.</p>
          <p>Periksa konfigurasi SQLite dan coba jalankan kembali aplikasi.</p>
        </div>
      `;
    }
  }
}

bootstrap();
