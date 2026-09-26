import { apiClient } from "./client";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationsPage,
} from "../types/messaging";

export async function fetchConversations(
  page = 1,
  pageSize = 20,
): Promise<ConversationsPage> {
  const { data } = await apiClient.get<ConversationsPage>("/conversations/", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchConversation(
  conversationId: string,
): Promise<ConversationDetail> {
  const { data } = await apiClient.get<ConversationDetail>(
    `/conversations/${conversationId}/`,
  );
  return data;
}

export async function startConversation(payload: {
  listing: string;
  content?: string;
}): Promise<ConversationDetail> {
  const { data } = await apiClient.post<ConversationDetail>(
    "/conversations/",
    payload,
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  const { data } = await apiClient.post<ChatMessage>(
    `/conversations/${conversationId}/messages/`,
    { content },
  );
  return data;
}

export async function markMessageRead(
  messageId: string,
): Promise<ChatMessage> {
  const { data } = await apiClient.patch<ChatMessage>(
    `/messages/${messageId}/read/`,
  );
  return data;
}
