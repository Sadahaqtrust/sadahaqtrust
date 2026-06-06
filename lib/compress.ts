import sharp from "sharp";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// Target sizes
const IMAGE_TARGET_KB = 125;
const VIDEO_TARGET_KB = 2048; // 2MB for video

export async function compressImage(inputBuffer: Buffer, ext: string): Promise<Buffer> {
  const targetBytes = IMAGE_TARGET_KB * 1024;

  // Already small enough
  if (inputBuffer.length <= targetBytes) return inputBuffer;

  const format = ["jpg", "jpeg"].includes(ext) ? "jpeg" : ext === "webp" ? "webp" : "png";

  // Start with quality 85, reduce until under target
  let quality = 85;
  let result = inputBuffer;

  while (quality >= 20) {
    try {
      if (format === "jpeg") {
        result = await sharp(inputBuffer)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      } else if (format === "webp") {
        result = await sharp(inputBuffer)
          .webp({ quality })
          .toBuffer();
      } else {
        // PNG — use compressionLevel + resize if needed
        result = await sharp(inputBuffer)
          .png({ compressionLevel: 9, adaptiveFiltering: true })
          .toBuffer();

        // PNG doesn't have quality — if still too big, convert to webp
        if (result.length > targetBytes) {
          result = await sharp(inputBuffer)
            .webp({ quality })
            .toBuffer();
        }
      }

      if (result.length <= targetBytes) break;
      quality -= 10;
    } catch {
      break;
    }
  }

  // If still too big after quality reduction, resize down
  if (result.length > targetBytes) {
    const meta = await sharp(inputBuffer).metadata();
    const width = meta.width || 1920;
    let scale = 0.8;

    while (result.length > targetBytes && scale > 0.2) {
      const newWidth = Math.round(width * scale);
      try {
        result = await sharp(inputBuffer)
          .resize(newWidth)
          .webp({ quality: 75 })
          .toBuffer();
        scale -= 0.1;
      } catch { break; }
    }
  }

  return result;
}

export async function compressVideo(inputPath: string, outputPath: string): Promise<void> {
  const targetKb = VIDEO_TARGET_KB;
  const stat = fs.statSync(inputPath);

  if (stat.size <= targetKb * 1024) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  // Get video duration
  let duration = 30;
  try {
    const probe = execSync(
      `ffprobe -v quiet -print_format json -show_format "${inputPath}" 2>/dev/null`,
      { timeout: 10000 }
    ).toString();
    const info = JSON.parse(probe);
    duration = parseFloat(info.format?.duration || "30");
  } catch {}

  // Calculate target bitrate: (targetKb * 8) / duration kbps
  const targetBitrate = Math.floor((targetKb * 8) / duration);
  const videoBitrate = Math.max(100, Math.floor(targetBitrate * 0.85));
  const audioBitrate = Math.min(64, Math.floor(targetBitrate * 0.15));

  try {
    execSync(
      `ffmpeg -i "${inputPath}" -c:v libx264 -b:v ${videoBitrate}k -c:a aac -b:a ${audioBitrate}k -movflags +faststart -y "${outputPath}" 2>/dev/null`,
      { timeout: 120000 }
    );
  } catch {
    // Fallback: just copy
    fs.copyFileSync(inputPath, outputPath);
  }
}

export function getOutputExt(inputExt: string): string {
  // Convert PNG to WebP for better compression, keep JPEG as JPEG
  if (["png", "gif", "bmp", "tiff", "tif"].includes(inputExt)) return "webp";
  if (["jpg", "jpeg"].includes(inputExt)) return "jpg";
  if (inputExt === "webp") return "webp";
  return inputExt;
}
