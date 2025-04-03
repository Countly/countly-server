import { Params } from "../../utils/common";

export interface UsersApi {
  getCurrentUser(params: Params): boolean;
  getUserById(params: Params): boolean;
  getAllUsers(params: Params): boolean;
  resetTimeBan(params: Params): boolean;
  createUser(params: Params): Promise<boolean>;
  updateUser(params: Params): Promise<boolean>;
  deleteUser(params: Params): Promise<boolean>;
  deleteOwnAccount(params: Params): Promise<boolean>;
  updateHomeSettings(params: Params): boolean;
  saveNote(params: Params): void;
  deleteNote(params: Params): void;
  ackNotification(params: Params): void;
}

declare const usersApi: UsersApi;
export default usersApi;
