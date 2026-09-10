import { defineConfig } from "prisma-cli-config";

export default defineConfig({
  name: "prisma",
  version: "5.0.0",
  config: {
    datasource: {
      url: process.env.DATABASE_URL,
    },
  },
});
