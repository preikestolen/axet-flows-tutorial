// Akis bir yerde hata verirse Submit dugmesi sonsuza kadar donmesin:
// catch -> bu dugum -> view action (kirmizi mesaj).
// catch'ten gelen msg, hatayi veren dugumun aldigi msg'dir; form alanlari
// (msg.__deptAppsFormioButtonClicked vb.) uzerinde durur.

// Alanin gercek adi __deptAppsFormioButtonClicked (yardim metnindeki __axetFlows... yanlis).
function formdanMi(m) { return !!(m.__deptAppsFormioButtonClicked || m.__axetFlowsFormioButtonClicked); }

if (!formdanMi(msg)) return null;   // formsuz test kosusu

const m = (msg.error && msg.error.message) || "bilinmeyen hata";
msg.messages = { hata: m.length > 300 ? m.slice(0, 300) + "..." : m };
delete msg.downloadFileSubmission;
return msg;
