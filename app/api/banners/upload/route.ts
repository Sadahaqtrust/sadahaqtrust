import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// Allowed types: image, video, audio
const TYPE_MAP: Record<string, "image" | "video" | "audio"> = {
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image",
  "image/webp": "image", "image/gif": "image",
  "video/mp4": "video", "video/webm": "video", "video/quicktime": "video",
  "audio/mpeg": "audio", "audio/mp3": "audio", "audio/wav": "audio",
  "audio/ogg": "audio", "audio/x-wav": "audio",
};
// Extension fallback when browser/curl sends generic mime
const EXT_MAP: Record<string, "image" | "video" | "audio"> = {
  jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image",
  mp4: "video", webm: "video", mov: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio",
};
const MAX = { image: 20 * 1024 * 1024, video: 100 * 1024 * 1024, audio: 20 * 1024 * 1024 };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const site = (formData.get("site") as string) || "digitalrohtak";
    const files = formData.getAll("files") as File[];
    const single = formData.get("file") as File | null;
    const allFiles = files.length > 0 ? files : (single ? [single] : []);

    if (!allFiles.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const safeSite = site.replace(/[^a-z0-9]/gi, "");
    const uploaded: any[] = [];
    const errors: string[] = [];

    for (const file of allFiles) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const kind = TYPE_MAP[file.type] || EXT_MAP[ext];
      if (!kind) { errors.push(`${file.name}: unsupported type ${file.type || ext}`); continue; }
      if (file.size > MAX[kind]) { errors.push(`${file.name}: too large for ${kind}`); continue; }

      const id = `bnr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fileName = `${id}.${ext || "bin"}`;
      const relDir = `/banners/${safeSite}/${kind}`;
      const absDir = path.join(process.cwd(), "public", "banners", safeSite, kind);
      if (!existsSync(absDir)) mkdirSync(absDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(path.join(absDir, fileName), buffer);

      uploaded.push({
        id,
        type: kind,
        src: `${relDir}/${fileName}`,
        size: file.size,
        mime: file.type,
      });
    }

    return NextResponse.json({ uploaded, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
