import fs from "fs";
import path from "path";

const CWD_CONFIG = path.resolve(process.cwd(), "config.json");

export type UserConfig = {
  password: string;
  displayName: string;
};

export type Config = {
  port: number;
  sessionTTL: number;
  pingInterval: number;
  botTimeout: number;
  botToken: string;  // Token for bot authentication
  users: Record<string, UserConfig>;
};

const defaultConfig: Config = {
  port: 17392,
  sessionTTL: 24 * 60 * 60 * 1000, // 24 hours
  pingInterval: 30000,
  botTimeout: 90000,
  botToken: "",  // Empty means no authentication required
  users: {
    admin: {
      password: "admin123",
      displayName: "管理员",
    },
  },
};

export function loadConfig(): Config {
  // Always create config.json in current directory if not exists
  if (!fs.existsSync(CWD_CONFIG)) {
    console.log("[Config] Creating config.json in current directory...");
    fs.writeFileSync(CWD_CONFIG, JSON.stringify(defaultConfig, null, 2));
  }

  try {
    const content = fs.readFileSync(CWD_CONFIG, "utf-8");
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
