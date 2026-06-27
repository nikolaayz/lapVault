export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { getSession } from "@/lib/auth/session";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FOLDERS = ["cars", "tracks", "profiles"] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const rawFolder = formData.get("folder") as string | null;
  const folder: UploadFolder = ALLOWED_FOLDERS.includes(rawFolder as UploadFolder)
    ? (rawFolder as UploadFolder)
    : "cars";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Only JPEG, PNG, WebP and GIF images are allowed" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `${folder}/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: buffer.length,
      }),
    );
  } catch (err) {
    console.error("[upload] R2 error:", err);
    return NextResponse.json(
      { error: "Storage upload failed — check R2 credentials and bucket name" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: `${R2_PUBLIC_URL}/${key}` });
}
