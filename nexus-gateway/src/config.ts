import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../config.json");

export type UserConfig = {
  password: string;
  displayName: string;
};

export type Config = {
  port: number;
  sessionTTL: number;
  pingInterval: number;
  botTimeout: number;
  users: Record<string, UserConfig>;
};

const defaultConfig: Config = {
  port: 17392,
  sessionTTL: 24 * 60 * 60 * 1000, // 24 hours
  pingInterval: 30000,
  botTimeout: 90000,
  users: {
    admin: {
      password: "admin123",
      displayName: "管理员",
    },
  },
};

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log("[Config] config.json not found, creating default...");
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
  }

  try {
    const content = fs.readFileSync(CONFIG_PATH, "utf-8");
    const fileConfig = JSON.parse(content) as Partial<Config>;

    // Merge with defaults
    const config: Config = {
      ...defaultConfig,
      ...fileConfig,
      users: { ...defaultConfig.users, ...fileConfig.users },
    };

    // Environment variable override
    if (process.env.PORT) {
      config.port = parseInt(process.env.PORT);
    }

    console.log(`[Config] port=${config.port}, users=${Object.keys(config.users).join(", ")}`);
    return config;

  } catch (err) {
    console.error("[Config] Failed to load:", err);
    return defaultConfig;
  }
}
