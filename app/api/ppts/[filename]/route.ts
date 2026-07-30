import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;
    const decodedFilename = decodeURIComponent(filename);

    // Try app/ppts directory first, then public/ppts
    let filePath = path.join(process.cwd(), "app", "ppts", decodedFilename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), "public", "ppts", decodedFilename);
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(decodedFilename)}"`,
      },
    });
  } catch (error) {
    console.error("Error serving PPT file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
