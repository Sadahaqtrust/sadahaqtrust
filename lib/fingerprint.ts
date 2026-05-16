// Browser fingerprint utility — generates a unique device ID
// Uses canvas, WebGL, screen, timezone, language, and platform info

export interface DeviceFingerprint {
  fingerprint: string;       // unique hash
  screen: string;            // e.g. "1920x1080"
  colorDepth: number;
  timezone: string;          // e.g. "Asia/Kolkata"
  language: string;          // e.g. "en-IN"
  platform: string;          // e.g. "Linux x86_64"
  cores: number;             // navigator.hardwareConcurrency
  memory: number | null;     // navigator.deviceMemory (GB)
  touchSupport: boolean;
  deviceModel: string;       // parsed from UA or userAgentData
  deviceBrand: string;       // parsed from UA or userAgentData
}

async function getDeviceModelFromUA(): Promise<{ brand: string; model: string }> {
  // Try modern API first (Chrome 90+)
  if ("userAgentData" in navigator) {
    try {
      const uaData = await (navigator as any).userAgentData.getHighEntropyValues([
        "model", "platform", "platformVersion", "architecture", "fullVersionList"
      ]);
      if (uaData.model) {
        return { brand: uaData.platform || "unknown", model: uaData.model };
      }
    } catch {}
  }

  // Fallback: parse User-Agent string
  const ua = navigator.userAgent;

  // Android: look for device model e.g. "SM-G991B", "Pixel 6", "Redmi Note 10"
  const androidMatch = ua.match(/;\s*([^;)]+)\s+Build\//);
  if (androidMatch) {
    const model = androidMatch[1].trim();
    // Try to extract brand
    let brand = "Android";
    if (/samsung|SM-/i.test(model)) brand = "Samsung";
    else if (/pixel/i.test(model)) brand = "Google";
    else if (/redmi|poco|mi\s/i.test(model)) brand = "Xiaomi";
    else if (/oneplus/i.test(model)) brand = "OnePlus";
    else if (/oppo|cph/i.test(model)) brand = "OPPO";
    else if (/vivo/i.test(model)) brand = "Vivo";
    else if (/realme|rmx/i.test(model)) brand = "Realme";
    else if (/moto|xt/i.test(model)) brand = "Motorola";
    else if (/nokia/i.test(model)) brand = "Nokia";
    else if (/huawei/i.test(model)) brand = "Huawei";
    return { brand, model };
  }

  // iPhone/iPad
  if (/iPhone/.test(ua)) return { brand: "Apple", model: "iPhone" };
  if (/iPad/.test(ua)) return { brand: "Apple", model: "iPad" };
  if (/Macintosh/.test(ua)) return { brand: "Apple", model: "Mac" };

  // Windows
  if (/Windows/.test(ua)) return { brand: "Microsoft", model: "Windows PC" };

  // Linux desktop
  if (/Linux/.test(ua) && !/Android/.test(ua)) return { brand: "Linux", model: "Desktop" };

  return { brand: "unknown", model: "unknown" };
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and pad
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("DigitalRohtak🔐", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("DigitalRohtak🔐", 4, 17);

    return hashString(canvas.toDataURL());
  } catch {
    return "canvas-error";
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no-webgl";

    const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `${vendor}~${renderer}`;
    }
    return "webgl-no-debug";
  } catch {
    return "webgl-error";
  }
}

export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  const { brand, model } = await getDeviceModelFromUA();

  const screen = `${window.screen.width}x${window.screen.height}`;
  const colorDepth = window.screen.colorDepth;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform || "unknown";
  const cores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as any).deviceMemory || null;
  const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const canvasFP = getCanvasFingerprint();
  const webglFP = getWebGLFingerprint();

  // Combine all signals into a fingerprint hash
  const raw = [
    screen, colorDepth, timezone, language, platform,
    cores, memory, touchSupport, canvasFP, webglFP,
  ].join("|");

  const fingerprint = hashString(raw) + "-" + hashString(canvasFP + webglFP);

  return {
    fingerprint,
    screen,
    colorDepth,
    timezone,
    language,
    platform,
    cores,
    memory,
    touchSupport,
    deviceModel: model,
    deviceBrand: brand,
  };
}
