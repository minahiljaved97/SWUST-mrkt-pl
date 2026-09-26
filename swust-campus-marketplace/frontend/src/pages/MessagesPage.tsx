import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";

import {
  fetchConversation,
  fetchConversations,
  markMessageRead,
  sendMessage,
} from "../api/messaging";
import { getApiErrorMessage } from "../api/client";
import { EmptyState, ErrorMessage, Loading } from "../components";
import { useAuth } from "../features/auth/AuthContext";
import { formatDate, formatPrice, sellerName } from "../lib/format";
import { resolveMediaUrl } from "../lib/media";
import type { ConversationSummary } from "../types/messaging";

const POLL_MS = 4000;

function ConversationListPanel({
  conversations,
  isLoading,
  error,
}: {
  conversations: ConversationSummary[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-slate-200 md:border-r">
      <div className="border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-semibold">Messages</h1>
        <p className="text-xs text-slate-500">Listing conversations with students</p>
      </div>
      {error ? (
        <div className="p-4">
          <ErrorMessage message={error} />
        </div>
      ) : null}
      {isLoading ? (
        <div className="p-4">
          <Loading label="Loading conversations" />
        </div>
      ) : null}
      {!isLoading && conversations.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No conversations yet"
            description="Tap Contact seller on a listing to start chatting."
            action={
              <Link className="text-sm underline" to="/marketplace">
                Browse marketplace
              </Link>
            }
          />
        </div>
      ) : null}
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const image = resolveMediaUrl(conversation.listing.primary_image);
          const other = conversation.other_participant;
          return (
            <li key={conversation.id}>
              <NavLink
                to={`/messages/${conversation.id}`}
                className={({ isActive }) =>
                  `flex gap-3 border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 ${
                    isActive ? "bg-slate-100" : "bg-white"
                  }`
                }
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {sellerName(other.first_name, other.last_name)}
                    </p>
                    {conversation.unread_count > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                        {conversation.unread_count > 9
                          ? "9+"
                          : conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {conversation.listing.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {conversation.last_message?.content || "No messages yet"}
                  </p>
                </div>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function MessagesLayout() {
  const { conversationId } = useParams();
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations(1, 50),
    refetchInterval: POLL_MS,
  });

  const conversations = conversationsQuery.data?.results ?? [];
  const error = conversationsQuery.isError
    ? getApiErrorMessage(
        conversationsQuery.error,
        "Could not load conversations.",
      )
    : null;

  return (
    <section className="overflow-hidden surface-card">
      <div className="grid h-[min(72svh,760px)] grid-cols-1 md:grid-cols-[minmax(260px,320px)_1fr]">
        <div
          className={
            conversationId ? "hidden h-full min-h-0 md:block" : "h-full min-h-0"
          }
        >
          <ConversationListPanel
            conversations={conversations}
            isLoading={conversationsQuery.isPending}
            error={error}
          />
        </div>
        <div
          className={
            conversationId ? "h-full min-h-0" : "hidden h-full min-h-0 md:block"
          }
        >
          <Outlet />
        </div>
      </div>
    </section>
  );
}

export function MessagesIndexPage() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <EmptyState
        title="Select a conversation"
        description="Choose a chat from the list, or contact a seller from a listing."
        action={
          <Link className="text-sm underline" to="/marketplace">
            Browse marketplace
          </Link>
        }
      />
    </div>
  );
}

export function ConversationThreadPage() {
  const { conversationId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const markedRef = useRef<Set<string>>(new Set());

  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => fetchConversation(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: POLL_MS,
  });

  const conversation = conversationQuery.data;
  const messages = conversation?.messages ?? [];

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: async () => {
      setDraft("");
      setSendError("");
      await queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      setSendError(getApiErrorMessage(error, "Could not send message."));
    },
  });

  const unreadIncoming = useMemo(
    () =>
      messages.filter(
        (message) =>
          !message.is_read && message.sender.id !== user?.id,
      ),
    [messages, user?.id],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversationId]);

  useEffect(() => {
    if (!conversationId || unreadIncoming.length === 0) {
      return;
    }
    const pending = unreadIncoming.filter(
      (message) => !markedRef.current.has(message.id),
    );
    if (pending.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      for (const message of pending) {
        markedRef.current.add(message.id);
        try {
          await markMessageRead(message.id);
        } catch {
          markedRef.current.delete(message.id);
        }
      }
      if (!cancelled) {
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        await queryClient.invalidateQueries({
          queryKey: ["conversation", conversationId],
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, unreadIncoming, queryClient]);

  if (conversationQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loading label="Loading conversation" />
      </div>
    );
  }

  if (conversationQuery.isError || !conversation) {
    return (
      <div className="p-6">
        <ErrorMessage
          message={getApiErrorMessage(
            conversationQuery.error,
            "Conversation not found or you do not have access.",
          )}
        />
        <button
          type="button"
          className="mt-4 text-sm underline"
          onClick={() => navigate("/messages")}
        >
          Back to messages
        </button>
      </div>
    );
  }

  const other = conversation.other_participant;
  const listingImage = resolveMediaUrl(conversation.listing.primary_image);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
        <button
          type="button"
          className="mt-1 text-sm text-slate-600 underline md:hidden"
          onClick={() => navigate("/messages")}
        >
          Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">
            {sellerName(other.first_name, other.last_name)}
          </p>
          <Link
            to={`/marketplace/${conversation.listing.id}`}
            className="mt-2 flex items-center gap-3 rounded-md border border-slate-200 p-2 hover:bg-slate-50"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
              {listingImage ? (
                <img
                  src={listingImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {conversation.listing.title}
              </p>
              <p className="text-xs text-slate-500">
                {formatPrice(
                  conversation.listing.price,
                  conversation.listing.transaction_type,
                )}{" "}
                · {formatDate(conversation.listing.created_at)}
              </p>
            </div>
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            No messages yet. Say hello about this listing.
          </p>
        ) : null}
        {messages.map((message) => {
          const mine = message.sender.id === user?.id;
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-900"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    mine ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {new Intl.DateTimeFormat("en", {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(message.created_at))}
                  {!mine && message.is_read ? " · Read" : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="border-t border-slate-200 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const content = draft.trim();
          if (!content || sendMutation.isPending) {
            return;
          }
          sendMutation.mutate(content);
        }}
      >
        {sendError ? (
          <div className="mb-2">
            <ErrorMessage message={sendError} />
          </div>
        ) : null}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="message-input">
            Message
          </label>
          <input
            id="message-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message…"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            maxLength={5000}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={sendMutation.isPending || !draft.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
