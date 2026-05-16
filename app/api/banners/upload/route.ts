import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import crypto from "crypto";
import { logAudit } from "@/lib/auditLog";
import { compressImage, compressVideo, getOutputExt } from "@/lib/compress";

export const maxDuration = 60;

const UPLOAD_BASE = path.join(process.cwd(), "public", "banners");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const site = (formData.get("site") as string) || "digitalrohtak";
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const siteDir = path.join(UPLOAD_BASE, site);
    if (!existsSync(siteDir)) execSync(`mkdir -p ${siteDir}`);

    const uploaded: { id: string; type: "image" | "video"; src: string; originalKb: number; compressedKb: number }[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalKb = Math.round(buffer.length / 1024);

      // 50MB hard limit
      if (buffer.length > 50 * 1024 * 1024) continue;

      const inputExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const isVideo = ["mp4", "webm", "mov", "ogg", "avi", "mkv"].includes(inputExt);
      const id = crypto.randomBytes(8).toString("hex");

      if (isVideo) {
        // Write original to temp, compress to final
        const tmpPath = path.join(siteDir, `tmp_${id}.${inputExt}`);
        const outExt = "mp4";
        const finalPath = path.join(siteDir, `${id}.${outExt}`);
        writeFileSync(tmpPath, buffer);
        await compressVideo(tmpPath, finalPath);
        try { unlinkSync(tmpPath); } catch {}
        const compressedKb = Math.round(require("fs").statSync(finalPath).size / 1024);
        uploaded.push({ id, type: "video", src: `/banners/${site}/${id}.${outExt}`, originalKb, compressedKb });
      } else {
        // Compress image
        const outExt = getOutputExt(inputExt);
        const compressed = await compressImage(buffer, inputExt);
        const filename = `${id}.${outExt}`;
        writeFileSync(path.join(siteDir, filename), compressed);
        const compressedKb = Math.round(compressed.length / 1024);
        uploaded.push({ id, type: "image", src: `/banners/${site}/${filename}`, originalKb, compressedKb });
      }
    }

    logAudit(req, "BANNER_UPLOAD", {
      site,
      fileCount: files.length,
      uploadedCount: uploaded.length,
      compressionStats: uploaded.map(u => `${u.originalKb}KB→${u.compressedKb}KB`),
    });

    return NextResponse.json({ success: true, uploaded });
  } catch (err: any) {
    console.error("Banner upload error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
