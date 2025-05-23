const API_URL = "will_be_set_later";
import { type GetBoardsRequest } from "../types/GetBoardsRequest";

export async function getBoards(payload: GetBoardsRequest) {
    const response = await fetch(`${API_URL}/boards?${payload}`);
    return response.json();
}