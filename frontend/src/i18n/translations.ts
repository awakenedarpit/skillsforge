export type Lang = "en" | "hi";

// All UI strings in English and Hindi
export const t = {
  // ── App-wide ──────────────────────────────────────────────────────────────
  appName:        { en: "SkillForge",                           hi: "SkillForge" },
  appTagline:     { en: "Factory Skill Management System",      hi: "कारखाना कौशल प्रबंधन प्रणाली" },
  employeePortal: { en: "Employee Portal",                      hi: "कर्मचारी पोर्टल" },
  managerPanel:   { en: "Manager Panel",                        hi: "मैनेजर पैनल" },
  logout:         { en: "Logout",                               hi: "लॉगआउट" },
  save:           { en: "Save",                                 hi: "सेव करें" },
  cancel:         { en: "Cancel",                               hi: "रद्द करें" },
  edit:           { en: "Edit",                                 hi: "बदलें" },
  delete:         { en: "Delete",                               hi: "हटाएं" },
  yes:            { en: "Yes, Delete",                          hi: "हाँ, हटाएं" },
  no:             { en: "No",                                   hi: "नहीं" },
  close:          { en: "Close",                                hi: "बंद करें" },
  view:           { en: "View",                                 hi: "देखें" },
  saved:          { en: "Saved!",                               hi: "सेव हुआ!" },
  saving:         { en: "Saving...",                            hi: "सेव हो रहा..." },
  loading:        { en: "Checking...",                          hi: "जाँच हो रही है..." },
  submit:         { en: "Submit",                               hi: "जमा करें" },
  submitting:     { en: "Submitting...",                        hi: "जमा हो रहा..." },
  search:         { en: "Search name, code, dept...",           hi: "नाम, कोड, विभाग खोजें..." },
  print:          { en: "Print",                                hi: "प्रिंट करें" },
  noData:         { en: "No data found.",                       hi: "कोई जानकारी नहीं मिली।" },
  fullAccess:     { en: "Full Access",                          hi: "पूरी पहुँच" },
  manager:        { en: "Manager",                              hi: "मैनेजर" },
  demoHint:       { en: "For Demo:",                            hi: "Demo के लिए:" },
  fillDemo:       { en: "Fill Demo ID",                         hi: "Demo ID भरें" },
  allDataSafe:    { en: "SkillForge v2.0 - All employee data is secure", hi: "SkillForge v2.0 - सभी कर्मचारी डेटा सुरक्षित है" },

  // ── Login ─────────────────────────────────────────────────────────────────
  employeeLogin:  { en: "Employee Login",                       hi: "कर्मचारी लॉगिन" },
  managerLogin:   { en: "Manager Login",                        hi: "मैनेजर लॉगिन" },
  loginToAccount: { en: "Login to your account",               hi: "अपने खाते में जाएं" },
  openMgrPanel:   { en: "Open Manager Panel",                   hi: "मैनेजर पैनल खोलें" },
  enterCreds:     { en: "Enter your email and password",        hi: "अपना ईमेल और पासवर्ड डालें" },
  enterMgrCreds:  { en: "Enter manager credentials",           hi: "मैनेजर क्रेडेंशियल्स डालें" },
  emailLabel:     { en: "Email ID",                             hi: "ईमेल आईडी" },
  passwordLabel:  { en: "Password",                             hi: "पासवर्ड" },
  loginBtn:       { en: "Login",                                hi: "लॉगिन करें" },
  badCreds:       { en: "Wrong email or password. Please try again.", hi: "गलत ईमेल या पासवर्ड है। फिर से कोशिश करें।" },
  fillFields:     { en: "Please enter email and password.",     hi: "ईमेल और पासवर्ड डालें" },

  // ── Sidebar nav ───────────────────────────────────────────────────────────
  home:         { en: "Home",               hi: "होम" },
  mySkills:     { en: "My Skills",          hi: "मेरी स्किल्स" },
  certificates: { en: "Certificates",       hi: "सर्टिफिकेट" },
  profile:      { en: "Profile",            hi: "प्रोफाइल" },
  dashboard:    { en: "Dashboard",          hi: "डैशबोर्ड" },
  allEmployees: { en: "All Employees",      hi: "सभी कर्मचारी" },
  skillGrid:    { en: "Skill Grid",         hi: "स्किल ग्रिड" },
  certReview:   { en: "Certificate Review", hi: "सर्टिफिकेट जाँच" },
  reports:      { en: "Reports",            hi: "रिपोर्ट" },

  // ── Home tab ──────────────────────────────────────────────────────────────
  greetingPrefix:   { en: "Hello,",                   hi: "नमस्ते," },
  todaySummary:     { en: "Here is your summary for today -", hi: "आपका आज का सारांश यहाँ है -" },
  mySkillsStat:     { en: "My Skills",                hi: "मेरी स्किल्स" },
  machines:         { en: "Machines",                 hi: "मशीनें" },
  expertSkillsStat: { en: "Expert Skills",            hi: "माहिर स्किल्स" },
  level34:          { en: "Level 3-4",                hi: "Level 3-4" },
  approvedCerts:    { en: "Approved Certs",           hi: "मंज़ूर सर्टिफिकेट" },
  approved:         { en: "Approved",                 hi: "स्वीकृत" },
  pendingCerts:     { en: "Under Review",             hi: "जाँच में" },
  pending:          { en: "Pending",                  hi: "लंबित" },
  myMachineSkills:  { en: "My Machine Skills",        hi: "मेरी मशीन स्किल्स" },
  noSkillsYet:      { en: "No skills added yet. Open the My Skills tab.", hi: "अभी कोई स्किल नहीं जोड़ी है। मेरी स्किल्स टैब खोलें।" },
  recentCerts:      { en: "Recent Certificates",      hi: "हाल के सर्टिफिकेट" },
  noCertsYet:       { en: "No certificates yet. Open the Certificates tab to add.", hi: "कोई सर्टिफिकेट नहीं। सर्टिफिकेट टैब में जोड़ें।" },
  certApproved:     { en: "Approved",                 hi: "मंज़ूर" },
  certPending:      { en: "Pending",                  hi: "जाँच में" },
  certRejected:     { en: "Rejected",                 hi: "अस्वीकार" },

  // ── Skills tab ────────────────────────────────────────────────────────────
  skillsTitle:     { en: "My Machine Skills",     hi: "मेरी मशीन स्किल्स" },
  skillsSubtitle:  { en: "Select your level for each machine. Changes save automatically.", hi: "हर मशीन पर अपना स्तर चुनें। बदलाव अपने आप सेव हो जाते हैं।" },
  levelLegend:     { en: "Level Guide:",          hi: "स्तर की जानकारी:" },
  lvl0: { en: "0 - No knowledge",  hi: "0 - नहीं जानते" },
  lvl1: { en: "1 - Basic",         hi: "1 - थोड़ा जानते" },
  lvl2: { en: "2 - Knows well",    hi: "2 - जानते हैं" },
  lvl3: { en: "3 - Proficient",    hi: "3 - अच्छे से जानते" },
  lvl4: { en: "4 - Expert",        hi: "4 - माहिर" },
  levelLabels: {
    en: ["No knowledge", "Basic", "Knows well", "Proficient", "Expert"] as string[],
    hi: ["नहीं जानते", "थोड़ा जानते", "जानते हैं", "अच्छे से जानते", "माहिर"] as string[],
  },

  // ── Certificates tab ──────────────────────────────────────────────────────
  certsTitle:       { en: "My Certificates",            hi: "मेरे सर्टिफिकेट" },
  certsSubtitle:    { en: "Submit certificates - the manager will approve or reject them.", hi: "अपने सर्टिफिकेट जोड़ें - मैनेजर उन्हें मंज़ूर या अस्वीकार करेंगे।" },
  addNewCert:       { en: "+ Add New Certificate",      hi: "+ नया सर्टिफिकेट जोड़ें" },
  addCertTitle:     { en: "Add New Certificate",        hi: "नया सर्टिफिकेट जोड़ें" },
  certName:         { en: "Certificate Name *",         hi: "सर्टिफिकेट का नाम *" },
  certNamePh:       { en: "e.g. CNC Programming",       hi: "जैसे: CNC प्रोग्रामिंग" },
  issuedBy:         { en: "Issued By *",                hi: "जारी करने वाली संस्था *" },
  issuedByPh:       { en: "e.g. NSDC, ITI, CIPET",     hi: "जैसे: NSDC, ITI, CIPET" },
  dateEarned:       { en: "Issue Date *",               hi: "जारी होने की तारीख *" },
  expiryDate:       { en: "Expiry Date (if any)",       hi: "समाप्ति तारीख (अगर है)" },
  submitCert:       { en: "Submit Certificate",         hi: "जमा करें" },
  certSubmitted:    { en: "Certificate submitted! Manager will review it.", hi: "सर्टिफिकेट जमा हो गया! मैनेजर जाँच करेंगे।" },
  fillRequired:     { en: "Please fill all required fields.", hi: "सभी जरूरी जानकारी भरें।" },
  noCerts:          { en: "No certificates yet.",       hi: "कोई सर्टिफिकेट नहीं है।" },
  noCertsHint:      { en: "Click Add New Certificate above.", hi: "ऊपर नया सर्टिफिकेट जोड़ें बटन दबाएं।" },
  expired:          { en: "Expired",                    hi: "समय सीमा खत्म" },
  issued:           { en: "Issued:",                    hi: "जारी:" },
  expiry:           { en: "Expiry:",                    hi: "समाप्त:" },
  confirmDelete:    { en: "Delete this certificate?",   hi: "क्या यह सर्टिफिकेट हटाएं?" },

  // ── Profile tab ───────────────────────────────────────────────────────────
  profileTitle:    { en: "My Profile",          hi: "मेरी प्रोफाइल" },
  profileSaved:    { en: "Profile saved!",      hi: "प्रोफाइल सेव हो गई!" },
  officeInfo:      { en: "Office Information",  hi: "कार्यालय जानकारी" },
  contactInfo:     { en: "Contact Information", hi: "संपर्क जानकारी" },
  empCode:         { en: "Employee Code",       hi: "कर्मचारी कोड" },
  department:      { en: "Department",          hi: "विभाग" },
  designation:     { en: "Designation",         hi: "पद" },
  joiningDate:     { en: "Joining Date",        hi: "शामिल होने की तारीख" },
  email:           { en: "Email",               hi: "ईमेल" },
  phone:           { en: "Mobile Number",       hi: "मोबाइल नंबर" },

  // ── Manager Dashboard ─────────────────────────────────────────────────────
  mgrDashTitle:     { en: "Manager Dashboard",          hi: "मैनेजर डैशबोर्ड" },
  mgrDashSub:       { en: "Factory overview at a glance", hi: "फैक्ट्री की पूरी जानकारी एक नज़र में" },
  totalEmployees:   { en: "Total Employees",            hi: "कुल कर्मचारी" },
  totalCerts:       { en: "Total Certificates",         hi: "कुल सर्टिफिकेट" },
  pendingReview:    { en: "Pending Review",             hi: "जाँच बाकी" },
  criticalMachines: { en: "Low Coverage Machines",      hi: "कम कवरेज मशीनें" },
  machineCoverage:  { en: "Machine Coverage Status",    hi: "मशीन कवरेज स्थिति" },
  operators:        { en: "operators",                  hi: "ऑपरेटर" },
  needed:           { en: "needed",                     hi: "चाहिए" },
  statusOk:         { en: "Good",                       hi: "ठीक है" },
  statusLow:        { en: "Low",                        hi: "कम" },
  statusCritical:   { en: "Critical",                   hi: "खतरा" },
  deptSummary:      { en: "Department Summary",         hi: "विभाग सारांश" },
  avgSkills:        { en: "employees - avg",            hi: "कर्मचारी - औसत" },
  skillsUnit:       { en: "skills",                     hi: "स्किल्स" },

  // ── Employees tab ─────────────────────────────────────────────────────────
  empTabTitle:  { en: "All Employees",     hi: "सभी कर्मचारी" },
  empFound:     { en: "employees found",   hi: "कर्मचारी मिले" },
  empCode2:     { en: "Code",              hi: "कोड" },
  empSkills:    { en: "Skills",            hi: "स्किल्स" },
  empCerts:     { en: "Certs",             hi: "सर्टिफिकेट" },
  empDetail:    { en: "Detail",            hi: "विवरण" },
  noSkill:      { en: "No skills",         hi: "कोई स्किल नहीं" },
  noCert:       { en: "No certificates",   hi: "कोई सर्टिफिकेट नहीं" },
  mobile:       { en: "Mobile",            hi: "मोबाइल" },
  joined:       { en: "Joined",            hi: "शामिल हुए" },
  skillsCount:  { en: "Skills",            hi: "स्किल्स" },
  certsCount:   { en: "Certificates",      hi: "सर्टिफिकेट" },

  // ── Skill Grid ────────────────────────────────────────────────────────────
  gridTitle:    { en: "Skill Grid",        hi: "स्किल ग्रिड" },
  gridSubtitle: { en: "Every employee skill on every machine in one view", hi: "हर कर्मचारी की हर मशीन पर स्किल एक जगह" },
  colorLegend:  { en: "Colors:",           hi: "रंग:" },
  employee:     { en: "Employee",          hi: "कर्मचारी" },

  // ── Certificate Review ────────────────────────────────────────────────────
  certReviewTitle:    { en: "Certificate Review",     hi: "सर्टिफिकेट जाँच" },
  certReviewSubtitle: { en: "Approve or reject employee certificates", hi: "कर्मचारियों के सर्टिफिकेट मंज़ूर या अस्वीकार करें" },
  filterAll:      { en: "All",             hi: "सभी" },
  filterPending:  { en: "Pending",         hi: "जाँच बाकी" },
  filterApproved: { en: "Approved",        hi: "मंज़ूर" },
  filterRejected: { en: "Rejected",        hi: "अस्वीकार" },
  approveBtn:     { en: "Approve",         hi: "मंज़ूर करें" },
  rejectBtn:      { en: "Reject",          hi: "अस्वीकार करें" },
  revertBtn:      { en: "Revert",          hi: "वापस करें" },
  noCertsFilter:  { en: "No certificates in this category.", hi: "इस श्रेणी में कोई सर्टिफिकेट नहीं है।" },
  issueDate:      { en: "Date:",           hi: "तारीख:" },

  // ── Reports ───────────────────────────────────────────────────────────────
  reportsTitle:      { en: "Reports",      hi: "रिपोर्ट" },
  reportsSubtitle:   { en: "Gaps and items needing attention", hi: "कमज़ोरियाँ और ध्यान देने वाली बातें" },
  gapReport:         { en: "Low Coverage Machines",  hi: "कम कवरेज वाली मशीनें" },
  gapOk:             { en: "All machines have sufficient coverage!", hi: "सभी मशीनों पर पर्याप्त कवरेज है!" },
  noSkillEmps:       { en: "Employees with No Skills",   hi: "बिना स्किल के कर्मचारी" },
  noSkillOk:         { en: "All employees have added skills!", hi: "सभी कर्मचारियों ने स्किल जोड़ी है!" },
  expiringCerts:     { en: "Certificates Expiring Soon (90 days)", hi: "जल्द समाप्त होने वाले सर्टिफिकेट (90 दिन)" },
  expiringOk:        { en: "No certificates expiring in the next 90 days.", hi: "अगले 90 दिनों में कोई सर्टिफिकेट खत्म नहीं होगा।" },
  daysLeft:          { en: "days left",    hi: "दिन बाकी" },
  statusLowBadge:    { en: "Low",          hi: "कम" },
  statusDanger:      { en: "Critical",     hi: "खतरनाक" },
  haveOperators:     { en: "operators present,", hi: "ऑपरेटर हैं," },
  needOperators:     { en: "needed",       hi: "चाहिए" },
} as const;

/** Pull a translated string by key */
export function tr(key: keyof typeof t, lang: Lang): string {
  const entry = t[key];
  if (typeof (entry as any).en === "object") return ""; // skip array entries
  return (entry as { en: string; hi: string })[lang];
}

/** Pull a translated skill level label */
export function trLevel(level: number, lang: Lang): string {
  return t.levelLabels[lang][level] ?? "";
}
