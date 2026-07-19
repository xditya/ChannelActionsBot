export interface UserSchema {
  userID: number;
}

export interface SettingsSchema {
  chatID: number;
  status: boolean;
  welcome: string;
}

export interface SessionData {
  __language_code?: string;
  awaitingWelcomeFor?: number;
}
