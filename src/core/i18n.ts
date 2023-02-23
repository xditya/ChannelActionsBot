import { MyContext } from "./types.ts";

import { I18n } from "i18n";

const i18n = new I18n<MyContext>({
  defaultLocale: "en",
  useSession: true,
});

export default i18n;
