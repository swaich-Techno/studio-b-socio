"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

const statusStyles = {
  Available: "bg-emerald-50 text-emerald-700",
  Busy: "bg-rose-50 text-rose-700",
  Away: "bg-amber-50 text-amber-700",
  Offline: "bg-slate-100 text-slate-600"
};

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatPage() {
  const [channels, setChannels] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeRoom, setActiveRoom] = useState("team");
  const [messages, setMessages] = useState(null);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [chatStatus, setChatStatus] = useState("Available");
  const [channelName, setChannelName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);
  const initialClientOpened = useRef(false);

  const loadChat = useCallback(async function loadChat({ keepScroll = false, room = activeRoom } = {}) {
    const response = await fetch(`/api/chat?room=${room}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load chat.");
      setMessages([]);
      return;
    }
    setChannels(data.channels || []);
    setClients(data.clients || []);
    setMessages(data.messages || []);
    setMembers(data.members || []);
    if (data.currentUser?.chatStatus && !keepScroll) setChatStatus(data.currentUser.chatStatus);
  }, [activeRoom]);

  const openClientChannel = useCallback(async function openClientChannel(clientId = selectedClientId) {
    if (!clientId) return;
    setError("");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "client-channel", clientId })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Client chat could not be opened.");
      return;
    }
    setSelectedClientId(clientId);
    setActiveRoom(data.channel.slug);
  }, [selectedClientId]);

  useEffect(() => {
    loadChat({ room: activeRoom });
    const interval = setInterval(() => loadChat({ keepScroll: true, room: activeRoom }), 8000);
    return () => clearInterval(interval);
  }, [activeRoom, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("clientId");
    if (clientId && clients.length && !initialClientOpened.current) {
      initialClientOpened.current = true;
      openClientChannel(clientId);
    }
  }, [clients, openClientChannel]);

  async function uploadChatFile(file) {
    const data = await readFileAsBase64(file);
    const currentChannel = channels.find((channel) => channel.slug === activeRoom);
    const clientId = currentChannel?.clientId?._id || currentChannel?.clientId || undefined;
    const response = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        module: "chat",
        category: "Chat attachment",
        name: file.name,
        mimeType: file.type,
        size: file.size,
        data
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "File upload failed.");
    return {
      name: result.file.name,
      url: `/api/files/${result.file._id}`,
      fileId: result.file._id,
      mimeType: result.file.mimeType
    };
  }

  async function sendMessage(event) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed && !attachment) return;
    setSaving(true);
    setError("");
    try {
      const attachments = attachment ? [await uploadChatFile(attachment)] : [];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, room: activeRoom, attachments })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Message could not be sent.");
      } else {
        setMessages((current) => [...(current || []), data.message]);
        setMessage("");
        setAttachment(null);
      }
    } catch (err) {
      setError(err.message || "Message could not be sent.");
    }
    setSaving(false);
  }

  async function createChannel(event) {
    event.preventDefault();
    const name = channelName.trim();
    if (!name) return;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "channel", name })
    });
    const data = await response.json();
    if (response.ok) {
      setChannelName("");
      setActiveRoom(data.channel.slug);
    } else {
      setError(data.error || "Channel could not be created.");
    }
  }

  async function updateStatus(nextStatus) {
    setChatStatus(nextStatus);
    await fetch("/api/chat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatStatus: nextStatus })
    });
    loadChat({ keepScroll: true });
  }

  async function togglePin(item) {
    await fetch("/api/chat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: item._id, pinned: !item.pinned })
    });
    loadChat({ keepScroll: true });
  }

  if (!messages) return <Loading label="Loading team chat..." />;

  const activeChannel = channels.find((channel) => channel.slug === activeRoom);
  const agencyChannels = channels.filter((channel) => !channel.clientId);
  const clientChannels = channels.filter((channel) => channel.clientId);
  const pinnedMessages = messages.filter((item) => item.pinned);
  const activeClient = activeChannel?.clientId;
  const isClientChat = Boolean(activeClient);

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Team Chat</h1>
          <p className="mt-2 text-slate-500">Group channels, pinned instructions, read counts, and file sharing for approved team members.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <label className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Availability</label>
          <select value={chatStatus} onChange={(event) => updateStatus(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
            {Object.keys(statusStyles).map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="card p-4">
          <h2 className="font-black text-slate-950">Channels</h2>
          <div className="mt-4 grid gap-2">
            {agencyChannels.map((channel) => (
              <button key={channel._id} onClick={() => setActiveRoom(channel.slug)} className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${activeRoom === channel.slug ? "bg-[#071525] text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                #{channel.name}
              </button>
            ))}
          </div>
          <form onSubmit={createChannel} className="mt-4">
            <input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="New topic channel" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
            <Button type="submit" className="mt-2 w-full">Add Channel</Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Client Chats</h3>
            <div className="mt-3 grid gap-2">
              {clientChannels.map((channel) => (
                <button key={channel._id} onClick={() => setActiveRoom(channel.slug)} className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${activeRoom === channel.slug ? "bg-accent text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                  {channel.clientId?.businessName || channel.name}
                </button>
              ))}
            </div>
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
              <option value="">Select client</option>
              {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
            </select>
            <Button type="button" onClick={() => openClientChannel()} className="mt-2 w-full" variant="secondary" disabled={!selectedClientId}>Open Client Chat</Button>
          </div>
        </aside>

        <section className="card flex min-h-[620px] flex-col overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-lg font-black text-slate-950">{isClientChat ? activeClient?.businessName || activeChannel?.name : `#${activeChannel?.name || "Agency Team"}`}</h2>
            <p className="text-sm text-slate-500">
              {isClientChat
                ? `Client-based chat for ${activeClient?.industry || "this client"}. Visible only to team members who can access this client.`
                : "Messages are saved in MongoDB and visible to approved team members only."}
            </p>
          </div>

          {pinnedMessages.length ? (
            <div className="border-b border-amber-100 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Pinned</p>
              {pinnedMessages.slice(-2).map((item) => (
                <p key={item._id} className="mt-1 text-sm text-amber-900">{item.message}</p>
              ))}
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.length ? messages.map((item) => (
              <article key={item._id} className={`flex ${item.isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[72%] ${item.isMine ? "bg-[#071525] text-white" : "border border-slate-100 bg-white text-slate-900"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold">{item.sender?.name || "Team member"}</span>
                    <span className={item.isMine ? "text-slate-300" : "text-slate-500"}>{item.sender?.role}</span>
                    <span className={item.isMine ? "text-slate-400" : "text-slate-400"}>{formatTime(item.createdAt)}</span>
                    <span className={item.isMine ? "text-slate-400" : "text-slate-400"}>{item.readCount || 0} read</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                  {item.attachments?.length ? (
                    <div className="mt-3 grid gap-2">
                      {item.attachments.map((file) => (
                        <a key={file.url} href={file.url} target="_blank" className={`rounded-xl px-3 py-2 text-sm font-semibold ${item.isMine ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>{file.name}</a>
                      ))}
                    </div>
                  ) : null}
                  <button type="button" onClick={() => togglePin(item)} className={`mt-3 text-xs font-bold ${item.isMine ? "text-slate-300" : "text-accent"}`}>{item.pinned ? "Unpin" : "Pin"}</button>
                </div>
              </article>
            )) : (
              <EmptyState title="No messages yet" message={isClientChat ? "Start this client chat with notes, instructions, files, or approvals for the account." : "Start this channel with a quick update for the team."} />
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-100 bg-white p-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={isClientChat ? "Write a client-specific message..." : "Write a team message..."}
              rows={3}
              maxLength={1200}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
            <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-xs text-slate-500">
                <p>{message.length}/1200 characters</p>
                <label className="mt-2 inline-flex cursor-pointer font-semibold text-accent">
                  {attachment ? attachment.name : "Attach file/image"}
                  <input type="file" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
                </label>
              </div>
              <Button type="submit" disabled={saving || (!message.trim() && !attachment)}>{saving ? "Sending..." : "Send Message"}</Button>
            </div>
          </form>
        </section>

        <aside className="card p-5">
          <h2 className="text-lg font-black text-slate-950">Approved Team</h2>
          <p className="mt-1 text-sm text-slate-500">Only names, roles, skills, and availability are shown to team members.</p>
          <div className="mt-5 grid gap-3">
            {members.map((member) => (
              <article key={member._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">{member.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{member.role}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[member.chatStatus] || statusStyles.Available}`}>{member.chatStatus || "Available"}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">{(member.skills || []).slice(0, 4).join(", ") || "Skills not added"}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
