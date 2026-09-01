import type { CapacitorConfig } from "@capacitor/cli"
import { KeyboardResize } from "@capacitor/keyboard"

const config: CapacitorConfig = {
  appId: "com.openjobmarket.app",
  appName: "OpenJobMarket",

  // Static web assets folder used when no server.url is set (offline / local builds).
  // For release builds the app loads the live site via server.url below.
  webDir: "out",

  server: {
    // Point the webview at the live deployment so all API routes, SSR, and
    // Supabase realtime work exactly as in the browser.
    // Remove (or comment out) this block only when shipping a fully-offline
    // static build produced by `npm run build:mobile`.
    url: "https://www.openjobmarket.com",
    cleartext: false, // HTTPS only — no plain-HTTP mixed-content
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a", // slate-900 — matches app dark theme
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      // WebView resizes to sit above the keyboard (so focused inputs scroll into
      // view). capacitor-init.tsx additionally hides the bottom nav on
      // keyboardWillShow so it doesn't ride up over the keyboard.
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
    // Capgo OTA updater — pushes native-shell updates without app store review.
    // The web app updates automatically via server.url (no OTA needed for UI).
    // OTA is used for: new Capacitor plugins, AndroidManifest changes, etc.
    // Bump APP_BUNDLE_VERSION env var on Vercel to trigger an OTA push.
    CapacitorUpdater: {
      autoUpdate: true,
      statsUrl: "",                         // disable Capgo telemetry (self-hosted)
      channelUrl: "https://www.openjobmarket.com/api/updates/channel",
      resetWhenUpdate: false,               // keep current bundle on failed update
    },
  },
}

export default config
