"use client";

import { useEffect, useState } from "react";

export const translations = {
  English: {
    Dashboard: "Dashboard",
    Clients: "Clients",
    Catalogues: "Catalogues",
    Generator: "Generator",
    Reels: "Reels",
    "Image Prompts": "Image Prompts",
    Trends: "Trends",
    Calendar: "Calendar",
    Tasks: "Tasks",
    Analytics: "Analytics",
    Reports: "Reports",
    Financials: "Financials",
    Chat: "Chat",
    Search: "Search",
    Notifications: "Notifications",
    Team: "Team",
    Approvals: "Approvals",
    Logout: "Logout",
    Save: "Save",
    Create: "Create",
    Update: "Update",
    Delete: "Delete",
    Approve: "Approve",
    Reject: "Reject",
    Pending: "Pending",
    Active: "Active",
    Completed: "Completed",
    "Add Client": "Add Client",
    "Add Team Member": "Add Team Member",
    "Select Language": "Select Language"
  },
  Punjabi: {
    Dashboard: "ਡੈਸ਼ਬੋਰਡ",
    Clients: "ਕਲਾਇੰਟ",
    Catalogues: "ਕੈਟਾਲਾਗ",
    Generator: "ਜਨਰੇਟਰ",
    Reels: "ਰੀਲਾਂ",
    "Image Prompts": "ਇਮੇਜ ਪ੍ਰੌਮਪਟ",
    Trends: "ਟ੍ਰੈਂਡ",
    Calendar: "ਕੈਲੰਡਰ",
    Tasks: "ਟਾਸਕ",
    Analytics: "ਐਨਾਲਿਟਿਕਸ",
    Reports: "ਰਿਪੋਰਟਾਂ",
    Financials: "ਫਾਇਨੈਂਸ",
    Chat: "ਚੈਟ",
    Search: "ਖੋਜ",
    Notifications: "ਨੋਟੀਫਿਕੇਸ਼ਨ",
    Team: "ਟੀਮ",
    Approvals: "ਮਨਜ਼ੂਰੀਆਂ",
    Logout: "ਲਾਗਆਉਟ",
    Save: "ਸੇਵ",
    Create: "ਬਣਾਓ",
    Update: "ਅਪਡੇਟ",
    Delete: "ਡਿਲੀਟ",
    Approve: "ਮਨਜ਼ੂਰ",
    Reject: "ਰੱਦ",
    Pending: "ਪੈਂਡਿੰਗ",
    Active: "ਐਕਟਿਵ",
    Completed: "ਪੂਰਾ",
    "Add Client": "ਕਲਾਇੰਟ ਜੋੜੋ",
    "Add Team Member": "ਟੀਮ ਮੈਂਬਰ ਜੋੜੋ",
    "Select Language": "ਭਾਸ਼ਾ ਚੁਣੋ"
  },
  Hindi: {
    Dashboard: "डैशबोर्ड",
    Clients: "क्लाइंट",
    Catalogues: "कैटलॉग",
    Generator: "जनरेटर",
    Reels: "रील्स",
    "Image Prompts": "इमेज प्रॉम्प्ट",
    Trends: "ट्रेंड्स",
    Calendar: "कैलेंडर",
    Tasks: "टास्क",
    Analytics: "एनालिटिक्स",
    Reports: "रिपोर्ट्स",
    Financials: "फाइनेंस",
    Chat: "चैट",
    Search: "खोज",
    Notifications: "नोटिफिकेशन",
    Team: "टीम",
    Approvals: "अप्रूवल्स",
    Logout: "लॉगआउट",
    Save: "सेव",
    Create: "बनाएं",
    Update: "अपडेट",
    Delete: "डिलीट",
    Approve: "अप्रूव",
    Reject: "रिजेक्ट",
    Pending: "पेंडिंग",
    Active: "एक्टिव",
    Completed: "पूरा",
    "Add Client": "क्लाइंट जोड़ें",
    "Add Team Member": "टीम मेंबर जोड़ें",
    "Select Language": "भाषा चुनें"
  }
};

export function useLanguage() {
  const [language, setLanguageState] = useState("English");

  useEffect(() => {
    const saved = localStorage.getItem("bSocioLanguage");
    if (saved) setLanguageState(saved);

    function syncLanguage(event) {
      if (event.detail) setLanguageState(event.detail);
    }

    window.addEventListener("bSocioLanguageChange", syncLanguage);
    return () => window.removeEventListener("bSocioLanguageChange", syncLanguage);
  }, []);

  function changeLanguage(nextLanguage) {
    setLanguageState(nextLanguage);
    localStorage.setItem("bSocioLanguage", nextLanguage);
    window.dispatchEvent(new CustomEvent("bSocioLanguageChange", { detail: nextLanguage }));
  }

  function t(label) {
    return translations[language]?.[label] || label;
  }

  return { language, setLanguage: changeLanguage, t };
}

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const options = [
    ["English", "English"],
    ["Punjabi", "ਪੰਜਾਬੀ"],
    ["Hindi", "हिंदी"]
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-bold text-slate-600">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          className={`rounded-full px-3 py-1.5 transition ${language === value ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
