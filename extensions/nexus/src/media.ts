import fs from "fs";
import path from "path";
import os from "os";
import type { GatewayMediaInfo } from "./types.js";
import { getGatewayRuntime } from "./runtime.js";

/**
 * 从 base64 字符串解析图片数据
 * 支持格式: "data:image/png;base64,..." 或纯 base64 字符串
 */
export function parseBase64Image(base64String: string): {
  buffer: Buffer;
  mimeType?: string;
} {
  // 检查是否是 data URL 格式
  const dataUrlMatch = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      buffer: Buffer.from(dataUrlMatch[2], "base64"),
      mimeType: dataUrlMatch[1],
    };
  }

  // 纯 base64 字符串
  return {
    buffer: Buffer.from(base64String, "base64"),
  };
}

/**
 * 根据 MIME 类型获取文件扩展名
 */
export function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg",
    "image/tiff": ".tiff",
    "image/ico": ".ico",
    "image/x-icon": ".ico",
  };
  return mimeToExt[mimeType] || ".bin";
}

/**
 * 检测 buffer 的 MIME 类型（通过魔数）
 */
export function detectMimeFromBuffer(buffer: Buffer): string | undefined {
  if (buffer.length < 4) return undefined;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return "image/gif";
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return "image/webp";
    }
  }

  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image/bmp";
  }

  return undefined;
}

/**
 * 保存 base64 图片到临时文件
 */
export async function saveBase64ImageToFile(
  base64String: string,
  maxBytes: number = 30 * 1024 * 1024,
): Promise<GatewayMediaInfo | null> {
  try {
    const { buffer, mimeType: parsedMime } = parseBase64Image(base64String);

    // 检查文件大小
    if (buffer.length > maxBytes) {
      console.log(`nexus: image too large (${buffer.length} bytes > ${maxBytes} bytes)`);
      return null;
    }

    // 检测 MIME 类型
    let mimeType = parsedMime || detectMimeFromBuffer(buffer);
    if (!mimeType) {
      mimeType = "image/png"; // 默认
    }

    // 生成文件名
    const ext = getExtensionFromMime(mimeType);
    const fileName = `nexus_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

    // 尝试使用 OpenClaw 的媒体保存功能
    try {
      const core = getGatewayRuntime();
      const saved = await core.channel.media.saveMediaBuffer(
        buffer,
        mimeType,
        "inbound",
        maxBytes,
      );
      return {
        path: saved.path,
        contentType: saved.contentType,
        placeholder: "<media:image>",
      };
    } catch {
      // 如果 OpenClaw API 不可用，使用临时目录
      const tmpDir = os.tmpdir();
      const filePath = path.join(tmpDir, fileName);
      await fs.promises.writeFile(filePath, buffer);
      return {
        path: filePath,
        contentType: mimeType,
        placeholder: "<media:image>",
      };
    }
  } catch (err) {
    console.error(`nexus: failed to save image: ${String(err)}`);
    return null;
  }
}

/**
 * 将本地文件转换为 base64
 */
export async function fileToBase64(filePath: string): Promise<string | null> {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const mimeType = detectMimeFromBuffer(buffer) || "application/octet-stream";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error(`nexus: failed to read file: ${String(err)}`);
    return null;
  }
}

/**
 * 构建媒体 payload 用于 inbound context
 */
export function buildGatewayMediaPayload(
  mediaList: GatewayMediaInfo[],
): {
  MediaPath?: string;
  MediaType?: string;
  MediaUrl?: string;
  MediaPaths?: string[];
  MediaUrls?: string[];
  MediaTypes?: string[];
} {
  const first = mediaList[0];
  const mediaPaths = mediaList.map((media) => media.path);
  const mediaTypes = mediaList.map((media) => media.contentType).filter(Boolean) as string[];
  return {
    MediaPath: first?.path,
    MediaType: first?.contentType,
    MediaUrl: first?.path,
    MediaPaths: mediaPaths.length > 0 ? mediaPaths : undefined,
    MediaUrls: mediaPaths.length > 0 ? mediaPaths : undefined,
    MediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
  };
}
