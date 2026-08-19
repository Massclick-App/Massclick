import React, { useState } from "react";
import { Alert, CircularProgress, Snackbar } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import styles from "./AdminCustomerCareChat.module.css";

export default function CustomerCareWorkspace(props) {
  const {
    attachment, authExpired, connected, conversations, endRef, formatTime, getInitials, handleAttachment, handleSend,
    handleStatusUpdate, input, listError, loadConversations, loadingList, loadingMessages,
    markRead, messages, mobilePane, quickReplies, search, selected, selectConversation,
    sendError, sending, setAttachment, setInput, setListError, setMobilePane, setSearch, setSendError,
    setShowDetails, setStatus, showDetails, status,
  } = props;
  const [showEmoji, setShowEmoji] = useState(false);
  const emojis = ["😀", "👍", "🙏", "✅", "😊", "🎉", "📞", "❤️"];

  return (
    <main className={styles.carePage}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>Customer experience</div>
          <h1 className={styles.title}>Customer Care Chat</h1>
          <p className={styles.subtitle}>Manage every customer conversation from one shared inbox.</p>
        </div>
        <div className={styles.statusGroup}>
          <div className={styles.livePill}><span className={styles.liveDot} />{connected ? "Live" : "Connecting"}</div>
          <button className={styles.refreshButton} onClick={loadConversations} aria-label="Refresh conversations"><RefreshIcon fontSize="small" /></button>
        </div>
      </header>

      {authExpired && <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>Your session has expired. Please refresh the page to log in again.</Alert>}
      {listError && <Alert severity="error" onClose={() => setListError(null)} sx={{ mb: 1.5, borderRadius: 2 }}>{listError}</Alert>}

      <section className={styles.workspace}>
        <aside className={`${styles.listPane} ${mobilePane === "chat" ? styles.hiddenMobile : ""}`}>
          <div className={styles.listTop}>
            <div className={styles.filterRow} role="group" aria-label="Conversation status">
              {["open", "closed", "all"].map((item) => (
                <button key={item} className={`${styles.filter} ${status === item ? styles.filterActive : ""}`} onClick={() => setStatus(item)}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
            <label className={styles.searchBox}><SearchIcon sx={{ fontSize: 18 }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations..." /></label>
          </div>
          <div className={styles.conversationList}>
            {loadingList && <CircularProgress size={26} sx={{ m: 3, color: "#f26522" }} />}
            {!loadingList && conversations.length === 0 && <div className={styles.emptyList}>No {status === "all" ? "" : status} conversations found.</div>}
            {conversations.map((conversation) => {
              const active = selected?.id === conversation.id;
              return (
                <button key={conversation.id} className={`${styles.conversation} ${active ? styles.conversationActive : ""}`} onClick={() => selectConversation(conversation)}>
                  <span className={styles.avatarWrap}>
                    <span className={styles.avatar}>{getInitials(conversation.customerName)}</span>
                    {!!conversation.unreadForAdmin && <span className={styles.unread}>{conversation.unreadForAdmin}</span>}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className={styles.conversationHead}><span className={styles.customerName}>{conversation.customerName || "Customer"}</span><span className={styles.conversationTime}>{formatTime(conversation.lastMessageAt)}</span></span>
                    <span className={styles.mobile}>{conversation.customerMobile || "No mobile number"}</span>
                    <span className={styles.preview}>{conversation.lastMessageText || "No messages yet"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${styles.chatPane} ${mobilePane !== "chat" ? styles.hiddenMobile : ""}`}>
          {!selected ? <div className={styles.emptyChat}><div><InfoOutlinedIcon sx={{ fontSize: 42, color: "#cbd5e1" }} /><br />Choose a conversation to start</div></div> : <>
            <header className={styles.chatHeader}>
              <div className={styles.profileSummary}>
                <button className={`${styles.iconAction} ${styles.mobileBack}`} onClick={() => setMobilePane("list")} aria-label="Back to conversations"><ArrowBackIcon fontSize="small" /></button>
                <span className={styles.headerAvatar}>{getInitials(selected.customerName)}</span>
                <span style={{ minWidth: 0 }}><div className={styles.headerName}>{selected.customerName || "Customer"}</div><div className={styles.onlineLine}><span className={styles.onlineDot} />{selected.customerMobile || "No mobile"} · {selected.status}</div></span>
              </div>
              <div className={styles.headerActions}>
                <button className={`${styles.iconAction} ${styles.desktopOnly}`} onClick={markRead} aria-label="Mark read"><DoneAllIcon fontSize="small" /></button>
                <button className={`${styles.iconAction} ${styles.mobileDetails}`} onClick={() => setShowDetails(true)} aria-label="Customer details"><InfoOutlinedIcon fontSize="small" /></button>
                <button className={`${styles.closeAction} ${selected.status === "closed" ? styles.reopenAction : ""}`} onClick={() => handleStatusUpdate(selected.status === "closed" ? "open" : "closed")}><CloseIcon sx={{ fontSize: 15 }} />{selected.status === "closed" ? "Reopen" : "Close"}</button>
              </div>
            </header>
            <div className={styles.messages}>
              <div className={styles.dateRule}>Today</div>
              {loadingMessages && <CircularProgress size={26} sx={{ color: "#f26522" }} />}
              {!loadingMessages && messages.length === 0 && <div className={styles.emptyChat}>No messages in this conversation yet.</div>}
              {messages.map((message) => {
                const admin = message.senderType === "admin";
                return <div key={message.id || message._id} className={`${styles.messageRow} ${admin ? styles.messageRowAdmin : ""}`}><div className={`${styles.bubble} ${admin ? styles.bubbleAdmin : ""}`}>{message.attachment?.url && (message.attachment.mimeType || "").startsWith("image/") && <a href={message.attachment.url} target="_blank" rel="noreferrer"><img className={styles.messageImage} src={message.attachment.url} alt={message.attachment.fileName || "Chat attachment"} /></a>}{message.attachment?.url && !(message.attachment.mimeType || "").startsWith("image/") && <a className={styles.fileCard} href={message.attachment.url} target="_blank" rel="noreferrer"><AttachFileIcon sx={{ fontSize: 18 }} /><span>{message.attachment.fileName}</span></a>}{message.text && <p className={styles.messageText}>{message.text}</p>}<div className={styles.messageMeta}>{formatTime(message.createdAt)}{admin && <DoneAllIcon sx={{ fontSize: 13 }} />}</div></div></div>;
              })}
              <div ref={endRef} />
            </div>
            <footer className={styles.composer}>
              <div className={styles.quickReplies}>{quickReplies.map((reply) => <button key={reply} className={styles.quickReply} onClick={() => setInput(reply)}><BoltIcon sx={{ fontSize: 12, verticalAlign: "middle", mr: .4 }} />{reply}</button>)}</div>
              {attachment && <div className={styles.attachmentPreview}><AttachFileIcon sx={{ fontSize: 16 }} /><span>{attachment.fileName}</span><button onClick={() => setAttachment(null)} aria-label="Remove attachment"><CloseIcon sx={{ fontSize: 15 }} /></button></div>}
              {showEmoji && <div className={styles.emojiPicker}>{emojis.map((emoji) => <button key={emoji} onClick={() => { setInput(`${input}${emoji}`); setShowEmoji(false); }}>{emoji}</button>)}</div>}
              <div className={styles.composerBox}>
                <input id="care-chat-attachment" className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx" onChange={(event) => { handleAttachment(event.target.files?.[0]); event.target.value = ""; }} />
                <label className={styles.composerIcon} htmlFor="care-chat-attachment" aria-label="Attach file" title="Attach file"><AttachFileIcon sx={{ fontSize: 19 }} /></label>
                <textarea rows="1" value={input} placeholder={selected.status === "closed" ? "Reply to reopen this chat" : "Type a reply..."} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } }} />
                <button className={styles.composerIcon} onClick={() => setShowEmoji((value) => !value)} aria-label="Add emoji"><SentimentSatisfiedAltIcon sx={{ fontSize: 19 }} /></button>
                <button className={styles.sendButton} onClick={handleSend} disabled={(!input.trim() && !attachment) || sending} aria-label="Send message">{sending ? <CircularProgress size={17} color="inherit" /> : <SendIcon sx={{ fontSize: 19 }} />}</button>
              </div>
            </footer>
          </>}
        </section>

        <aside className={styles.detailsPane}>
          <div className={styles.detailsTitle}>Customer details</div>
          {selected ? <>
            <div className={styles.detailsProfile}><div className={styles.detailsAvatar}>{getInitials(selected.customerName)}</div><div className={styles.detailsName}>{selected.customerName || "Customer"}</div><div className={styles.owner}>Customer</div><div className={styles.verified}><CheckCircleOutlineIcon sx={{ fontSize: 12 }} /> Verified contact</div></div>
            <div className={styles.detailRows}><div className={styles.detailRow}><PhoneOutlinedIcon sx={{ fontSize: 16 }} />{selected.customerMobile || "Not provided"}</div><div className={styles.detailRow}><LocationOnOutlinedIcon sx={{ fontSize: 16 }} />India</div></div>
            <div className={styles.stats}><div className={styles.stat}><div className={styles.statValue}>—</div><div className={styles.statLabel}>LEADS</div></div><div className={styles.stat}><div className={styles.statValue}>—</div><div className={styles.statLabel}>ENQUIRIES</div></div><div className={styles.stat}><div className={styles.statValue}>—</div><div className={styles.statLabel}>REVIEWS</div></div></div>
            <div className={styles.note}><strong>Internal note</strong><br />Customer context and private team notes can be added here.</div>
          </> : <div className={styles.emptyList}>Select a conversation to view customer details.</div>}
        </aside>
      </section>

      {showDetails && selected && <div className={styles.mobileDetailOverlay} onClick={() => setShowDetails(false)}>
        <aside className={styles.mobileDetailCard} onClick={(event) => event.stopPropagation()}>
          <div className={styles.detailsTitle}>Customer details <button className={styles.iconAction} onClick={() => setShowDetails(false)} aria-label="Close details"><CloseIcon fontSize="small" /></button></div>
          <div className={styles.detailsProfile}><div className={styles.detailsAvatar}>{getInitials(selected.customerName)}</div><div className={styles.detailsName}>{selected.customerName || "Customer"}</div><div className={styles.owner}>Customer</div><div className={styles.verified}><CheckCircleOutlineIcon sx={{ fontSize: 12 }} /> Verified contact</div></div>
          <div className={styles.detailRows}><div className={styles.detailRow}><PhoneOutlinedIcon sx={{ fontSize: 16 }} />{selected.customerMobile || "Not provided"}</div><div className={styles.detailRow}><LocationOnOutlinedIcon sx={{ fontSize: 16 }} />India</div></div>
        </aside>
      </div>}

      <Snackbar open={Boolean(sendError)} autoHideDuration={6000} onClose={() => setSendError(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}><Alert severity="error" onClose={() => setSendError(null)} sx={{ minWidth: 300 }}>{sendError}</Alert></Snackbar>
    </main>
  );
}
