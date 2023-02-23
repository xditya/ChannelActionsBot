import { ObjectId } from "mongo";

export interface UserSchema {
  _id: ObjectId;
  userID: number;
}

export interface SettingsSchema {
  _id: ObjectId;
  chatID: number;
  status: boolean;
  welcome: string;
}

export interface SessionData {
  __language_code?: string;
}
