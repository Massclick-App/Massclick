import React, { useState } from "react";
import { Box } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { BookOpen, CircleHelp, Headphones, MessageCircle, Ticket } from "lucide-react";
import CustomerChatPanel from "../../../../components/chat/CustomerChatPanel";
import OTPLoginModal from "../../AddBusinessModel";
import styles from "./CustomerServicePage.module.css";
import { setSupportSection } from "../../../../redux/actions/supportAction";
import { ContactPanel, KnowledgePanel, TicketsPanel } from "./SupportPanels";

const supportLinks = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "help", label: "Help Center", icon: CircleHelp },
  { id: "guides", label: "Guides", icon: BookOpen },
  { id: "contact", label: "Contact Us", icon: Headphones },
];

export default function CustomerServicePage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const dispatch = useDispatch();
  const activeSection = useSelector((state) => state.support.activeSection);

  return (
    <Box className={styles.page}>
      <section className={styles.supportCard} aria-label="MassClick customer support">
        <aside className={styles.sidebar} aria-label="Support navigation">
          <h1 className={styles.sidebarTitle}>Support</h1>
          <nav className={styles.navigation}>
            {supportLinks.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => dispatch(setSupportSection(id))} className={`${styles.navItem} ${activeSection === id ? styles.navItemActive : ""}`} aria-current={activeSection === id ? "page" : undefined}>
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className={styles.chatArea}>
          {activeSection === "chat" && <CustomerChatPanel embedded onRequireLogin={() => setLoginOpen(true)} />}
          {activeSection === "tickets" && <TicketsPanel onLogin={() => setLoginOpen(true)} />}
          {activeSection === "help" && <KnowledgePanel mode="help" />}
          {activeSection === "guides" && <KnowledgePanel mode="guides" />}
          {activeSection === "contact" && <ContactPanel />}
        </main>
      </section>
      <OTPLoginModal open={loginOpen} handleClose={() => setLoginOpen(false)} />
    </Box>
  );
}
