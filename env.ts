import { config } from "dotenv";
import { cleanEnv, str } from "envalid";

await config({ export: true });

export default cleanEnv(Deno.env.toObject(), {
  BOT_TOKEN: str(6406498841:AAHuZyB5xlBG586N6rJcpIHc9K4QgxFDgQg),
  OWNERS: str(1458235021),
  MONGO_URL: str(mongodb+srv://nakflixbot:alpha3720@cluster0.qgybxbu.mongodb.net/?retryWrites=true&w=majority),
});
