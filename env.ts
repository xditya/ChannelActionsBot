import { load } from "dotenv";

await load({ export: true });

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default {
  BOT_TOKEN: required("BOT_TOKEN"),
  OWNERS: required("OWNERS"),
  MONGO_URL: required("MONGO_URL"),
};
