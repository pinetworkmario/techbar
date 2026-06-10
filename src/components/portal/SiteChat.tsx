"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  MessageCircle,
  Mic,
  Send,
  UserRoundCog,
  X,
} from "lucide-react";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentPart[];
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB per image (base64-encoded inline)

export function SiteChat({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{
    name: string;
    dataUrl: string;
    sizeKb: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const recognitionRef = useRef<unknown | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const Recog =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
    setRecognitionAvailable(!!Recog);
  }, []);

  // Allow other components (e.g. SupportFloatingButton) to open the chat panel
  // by dispatching a window-level custom event.
  useEffect(() => {
    function handler() {
      setOpen(true);
    }
    window.addEventListener("pi:open-site-chat", handler);
    return () => window.removeEventListener("pi:open-site-chat", handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  function startVoice() {
    if (recording) {
      stopVoice();
      return;
    }
    const W = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const Recog = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Recog) {
      setError("Voice input not supported in this browser (try Chrome).");
      return;
    }
    const r = new (Recog as new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult:
        | ((e: { results: { 0: { transcript: string } }[] }) => void)
        | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    })();
    r.lang = navigator.language || "en-AU";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join("");
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    };
    r.onerror = (e) => {
      setError(`Voice: ${e.error}`);
      setRecording(false);
    };
    r.onend = () => setRecording(false);
    r.start();
    recognitionRef.current = r;
    setRecording(true);
  }

  function stopVoice() {
    const r = recognitionRef.current as { stop: () => void } | null;
    r?.stop?.();
    setRecording(false);
  }

  async function pickImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image files allowed");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 4 MB.`);
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
    setPendingImage({
      name: file.name,
      dataUrl,
      sizeKb: Math.round(file.size / 1024),
    });
    setError(null);
  }

  async function send() {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (busy) return;
    setError(null);

    let userContent: ChatMessage["content"];
    if (pendingImage) {
      const parts: ContentPart[] = [];
      if (text) parts.push({ type: "text", text });
      parts.push({
        type: "image_url",
        image_url: { url: pendingImage.dataUrl },
      });
      userContent = parts;
    } else {
      userContent = text;
    }

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: userContent },
    ];
    setMessages(next);
    setInput("");
    setPendingImage(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/account/sites/${siteId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Chat failed");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: j.reply || "(no reply)" },
      ]);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function requestHumanHandoff() {
    const reason =
      window.prompt(
        "Briefly describe what you need help with (optional):",
        "",
      ) ?? "";
    if (reason === null) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/account/sites/${siteId}/chat/handoff`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason, messages }),
        },
      );
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Handoff failed");
        return;
      }
      setHandoffNote(
        `Request sent. A team member will reach out shortly. Reference: ${j.handoff?.id ?? "—"}`,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function renderContent(c: ChatMessage["content"]) {
    if (typeof c === "string") return <span>{c}</span>;
    return (
      <span className="space-y-1">
        {c.map((p, i) =>
          p.type === "text" ? (
            <span key={i} className="block">
              {p.text}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={p.image_url.url}
              alt="attachment"
              className="mt-1 max-h-40 rounded-md border border-slate-200"
            />
          ),
        )}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-brand-700/20 hover:bg-brand-700"
        aria-label="Ask about this site"
      >
        <MessageCircle className="h-4 w-4" />
        Ask about {siteName}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[34rem] w-[24rem] flex-col rounded-lg bg-white shadow-2xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between rounded-t-lg border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900">
            Site assistant
          </p>
          <p className="truncate text-[11px] text-slate-500">{siteName}</p>
        </div>
        <button
          type="button"
          onClick={requestHumanHandoff}
          disabled={busy}
          className="mr-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-200 disabled:opacity-50"
          title="Switch to a human agent"
        >
          <UserRoundCog className="h-3.5 w-3.5" />
          Human
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Ask about devices, services, recent tickets, or outages for{" "}
            <span className="font-medium">{siteName}</span>. The assistant only
            sees this site's data. You can also send an image (e.g. a
            screenshot) or use voice input.
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              "flex " + (m.role === "user" ? "justify-end" : "justify-start")
            }
          >
            <div
              className={
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs " +
                (m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-800")
              }
            >
              {renderContent(m.content)}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: "240ms" }}
                />
              </span>
            </div>
          </div>
        ) : null}
        {handoffNote ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
            {handoffNote}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      {pendingImage ? (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-1.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage.dataUrl}
              alt={pendingImage.name}
              className="h-8 w-8 rounded object-cover ring-1 ring-slate-200"
            />
            <span className="truncate">
              {pendingImage.name} ({pendingImage.sizeKb} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="rounded-md p-0.5 text-slate-500 hover:bg-slate-200"
            aria-label="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="border-t border-slate-100 p-2">
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            aria-label="Attach image"
            title="Attach image"
          >
            <ImagePlus className="h-4 w-4" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickImage(f);
                e.target.value = "";
              }}
            />
          </button>
          {recognitionAvailable ? (
            <button
              type="button"
              onClick={startVoice}
              disabled={busy}
              className={
                "inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-50 " +
                (recording ? "bg-rose-100 text-rose-600 ring-1 ring-rose-300" : "bg-slate-100")
              }
              aria-label={recording ? "Stop recording" : "Voice input"}
              title={recording ? "Stop recording" : "Voice input"}
            >
              <Mic
                className={"h-4 w-4 " + (recording ? "animate-pulse" : "")}
              />
            </button>
          ) : null}
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              recording ? "Listening… speak now" : "Ask a question…"
            }
            disabled={busy}
            className="flex-1 resize-none rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || (!input.trim() && !pendingImage)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
