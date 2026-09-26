import type { Listing, Paginated, SellerSummary } from "./marketplace";

export type ChatMessage = {
  id: string;
  conversation: string;
  sender: SellerSummary;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  listing: Listing;
  buyer: SellerSummary;
  seller: SellerSummary;
  other_participant: SellerSummary;
  last_message: ChatMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
};

export type ConversationsPage = Paginated<ConversationSummary>;
