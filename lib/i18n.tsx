// Bilingual text — Hindi + English for all UI elements
export const T = {
  // Navbar
  signIn:       { en: "Sign In",    hi: "साइन इन" },
  register:     { en: "Register",   hi: "रजिस्टर" },
  signOut:      { en: "Sign Out",   hi: "साइन आउट" },
  changePin:    { en: "Change PIN", hi: "PIN बदलें" },
  shopping:     { en: "Shopping",   hi: "खरीदारी" },
  cart:         { en: "Cart",       hi: "कार्ट" },

  // Footer
  serving:      { en: "Serving Rohtak, Haryana", hi: "रोहतक, हरियाणा की सेवा में" },
  maintained:   { en: "Site maintained by",      hi: "साइट संचालित" },
  inAssoc:      { en: "In collaboration with Indian Partner", hi: "भारतीय साझेदार के साथ" },
  supported:    { en: "Supported by",            hi: "समर्थित" },
  copyright:    { en: "All rights reserved.",    hi: "सर्वाधिकार सुरक्षित।" },

  // Auth
  welcomeBack:  { en: "Welcome Back",            hi: "वापसी पर स्वागत है" },
  signInSub:    { en: "Sign in with your email and 4-digit PIN", hi: "ईमेल और 4-अंकीय PIN से साइन इन करें" },
  email:        { en: "Email",                   hi: "ईमेल" },
  pin:          { en: "4-Digit PIN",             hi: "4-अंकीय PIN" },
  forgotPin:    { en: "Forgot PIN?",             hi: "PIN भूल गए?" },
  rememberMe:   { en: "Remember me for 1 year", hi: "1 साल तक याद रखें" },
  noAccount:    { en: "Don't have an account?", hi: "खाता नहीं है?" },
  registerHere: { en: "Register here",           hi: "यहाँ रजिस्टर करें" },

  // Services
  ourServices:  { en: "Our Services",            hi: "हमारी सेवाएं" },
  searchSvc:    { en: "Search services...",      hi: "सेवाएं खोजें..." },
  available:    { en: "services available",      hi: "सेवाएं उपलब्ध" },

  // Profile
  accountNo:    { en: "Account No",             hi: "खाता नं." },
  memberSince:  { en: "Member Since",           hi: "सदस्य बने" },
  phone:        { en: "Phone",                  hi: "फ़ोन" },
  confirmSignOut: { en: "Sure you want to sign out?", hi: "क्या आप साइन आउट करना चाहते हैं?" },
  yes:          { en: "Yes, Sign Out",          hi: "हाँ, साइन आउट" },
  cancel:       { en: "Cancel",                 hi: "रद्द करें" },
};

// Helper — renders "Hindi / English" bilingual label
export function bi(key: keyof typeof T): string {
  return `${T[key].hi} / ${T[key].en}`;
}

// Bilingual JSX helper — returns span with both languages
export function BiText({ k, className = "" }: { k: keyof typeof T; className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold">{T[k].hi}</span>
      <span className="text-white/70 text-xs ml-1">/ {T[k].en}</span>
    </span>
  );
}
