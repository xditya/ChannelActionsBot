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

export interface StatsDailySchema {
  _id: string; // "YYYY-MM-DD"
  approved?: number;
  declined?: number;
}

export interface ChatStatsDailySchema {
  chatID: number;
  date: string; // "YYYY-MM-DD"
  approved?: number;
  declined?: number;
  expiresAt: Date;
}

export interface CounterSchema {
  _id: string;
  usersSeen?: number;
}

export interface ChatSchema {
  chatID: number;
  title: string;
  username?: string | null;
  type: string;
  updatedAt: Date;
}

export interface AdminSchema {
  chatID: number;
  userID: number;
}
