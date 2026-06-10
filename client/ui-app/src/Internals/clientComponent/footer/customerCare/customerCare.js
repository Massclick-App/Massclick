import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import styles from "./customerCare.module.css";
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CallIcon from '@mui/icons-material/Call';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";
import { Box, Drawer } from "@mui/material";
import OTPLoginModal from "../../AddBusinessModel";
import CustomerChatPanel from "../../../../components/chat/CustomerChatPanel";
const cx = createScopedClassNames(styles);
const whatsappCommunityUrl = process.env.REACT_APP_WHATSAPP_COMMUNITY_URL || "https://chat.whatsapp.com/LPgedrPJv3TKzHlxsUrJhl";
const carePillars = [{
  id: 1,
  title: "Knowledge Base & FAQs",
  description: "Find instant answers to common questions about accounts, billing, and services. Search our extensive library for quick self-help.",
  icon: LiveHelpIcon,
  buttonText: "Search Articles",
  link: "/knowledgebase"
}, {
  id: 2,
  title: "Speak to a Specialist",
  description: "For technical issues or personalized consultation, connect directly with our expert team via live chat or a scheduled call.",
  icon: SupportAgentIcon,
  buttonText: "Start Live Chat",
  action: "chat",
  link: "/customercare"
}, {
  id: 3,
  title: "WhatsApp Community",
  description: "Join the Massclick WhatsApp community to get service updates, share feedback, report minor issues, and connect with our support team.",
  icon: WhatsAppIcon,
  buttonText: "Join WhatsApp",
  link: whatsappCommunityUrl,
  external: true
}];
const contactLeads = [{
  id: 1,
  role: "CEO Support",
  phone: "+91 97891 04201",
  icon: BusinessCenterIcon,
  note: "Priority executive assistance"
}, {
  id: 2,
  role: "HR Contact",
  phone: "+91 93454 98086",
  icon: CallIcon,
  note: "People operations and partnership support"
}];
const CareCard = ({
  pillar,
  onStartChat
}) => {
  const IconComponent = pillar.icon;
  const handleClick = event => {
    if (pillar.action === "chat") {
      event.preventDefault();
      onStartChat();
    }
  };
  return <div className={cx("care-card")}>
            <div className={cx("icon-wrapper")}>
                <IconComponent className={cx("care-icon")} />
            </div>
            <h3 className={cx("card-title")}>{pillar.title}</h3>
            <p className={cx("card-description")}>{pillar.description}</p>
            <a href={pillar.link} className={cx("card-button")} onClick={handleClick} target={pillar.external ? "_blank" : undefined} rel={pillar.external ? "noopener noreferrer" : undefined}>
                {pillar.buttonText}
            </a>
        </div>;
};
const CustomerCareComponent = () => {
  const dispatch = useDispatch();
  const [chatOpen, setChatOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [openChatAfterLogin, setOpenChatAfterLogin] = useState(false);
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer);
  useEffect(() => {
    dispatch(fetchSeoMeta({
      pageType: "customerCare"
    }));
  }, [dispatch]);
  const fallbackSeo = {
    title: "Customer Care - Massclick",
    description: "Massclick is a leading local search platform helping users discover trusted businesses and services.",
    keywords: "about massclick, business directory, local search",
    canonical: "https://massclick.in/customerCare",
    robots: "index, follow"
  };
  useEffect(() => {
    const handleAuthChange = () => {
      if (openChatAfterLogin && localStorage.getItem("authToken")) {
        setLoginOpen(false);
        setChatOpen(true);
        setOpenChatAfterLogin(false);
      }
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, [openChatAfterLogin]);
  const handleStartChat = () => {
    if (!localStorage.getItem("authToken")) {
      setOpenChatAfterLogin(true);
      setLoginOpen(true);
      return;
    }
    setChatOpen(true);
  };
  return <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch /><br /><br /><br />
            <section className={cx("section-customer-care")}>
                <div className={cx("care-header-wrapper")}>
                    <h2 className={cx("section-title-care")}>Dedicated Customer Care</h2>
                    <p className={cx("section-subtitle-care")}>
                    </p>
                </div>

                <div className={cx("care-top-banner")}>
                    <div className={cx("banner-copy")}>
                        <span className={cx("care-badge")}>Global Service | Executive Access</span>
                        <h3 className={cx("banner-title")}>Your customer care team is ready to help, anytime.</h3>
                        <p className={cx("banner-copy-text")}>
                            Speak directly with our leadership and support specialists for business strategy, HR queries, and premium assistance.
                        </p>
                    </div>

                    <div className={cx("banner-contact-cards")}>
                        {contactLeads.map(lead => {
            const IconComponent = lead.icon;
            return <div key={lead.id} className={cx("contact-card")}>
                                    <div className={cx("contact-icon")}>
                                        <IconComponent />
                                    </div>
                                    <p className={cx("contact-role")}>{lead.role}</p>
                                    <a href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`} className={cx("contact-phone")}>
                                        {lead.phone}
                                    </a>
                                    <p className={cx("contact-note")}>{lead.note}</p>
                                </div>;
          })}
                    </div>
                </div>

                <div className={cx("care-grid-container")}>
                    {carePillars.map(pillar => <CareCard key={pillar.id} pillar={pillar} onStartChat={handleStartChat} />)}
                </div>
            </section>
            <Drawer anchor="right" open={chatOpen} onClose={() => setChatOpen(false)} sx={{ zIndex: 1300 }}>
                <Box sx={{ p: 2, width: { xs: "100vw", sm: 500 }, maxWidth: "100vw" }}>
                    <CustomerChatPanel
                      open={chatOpen}
                      onClose={() => setChatOpen(false)}
                      onRequireLogin={() => {
                        setOpenChatAfterLogin(true);
                        setLoginOpen(true);
                      }}
                    />
                </Box>
            </Drawer>
            <OTPLoginModal open={loginOpen} handleClose={() => setLoginOpen(false)} />
            <Footer />
        </>;
};
export default CustomerCareComponent;
