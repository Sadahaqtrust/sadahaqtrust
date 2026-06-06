"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

export default function EmailDashboardPage() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [emails, setEmails] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("Sent");
  const [searchQ, setSearchQ] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [advFrom, setAdvFrom] = useState("");
  const [advTo, setAdvTo] = useState("");
  const [advSubject, setAdvSubject] = useState("");
  const [advDateFrom, setAdvDateFrom] = useState("");
  const [advDateTo, setAdvDateTo] = useState("");
  const [legalOnly, setLegalOnly] = useState(false);
  const [attOnly, setAttOnly] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/barter/emails");
  }, [loading, customer]);

  useEffect(() => {
    if (customer) fetchEmails();
  }, [customer, page, tab, legalOnly, attOnly]);

  const fetchEmails = async () => {
    if (!customer) return;
    setFetching(true);
    const params = new URLSearchParams({
      owner_id: customer.id,
      folder: tab,
      page: page.toString(),
      limit: "20",
    });
    if (searchQ) params.set("q", searchQ);
    if (legalOnly) params.set("legal", "true");
    if (attOnly) params.set("attachment", "true");
    if (advFrom) params.set("from", advFrom);
    if (advTo) params.set("to", advTo);
    if (advSubject) params.set("subject", advSubject);
    if (advDateFrom) params.set("date_from", advDateFrom);
    if (advDateTo) params.set("date_to", advDateTo);

    const res = await fetch(`/api/email/public?${params}`);
    const data = await res.json();
    setEmails(data.emails || []);
    setTotal(data.total || 0);
    setFetching(false);
  };

  const doSearch = () => { setPage(1); fetchEmails(); };

  const viewEmail = async (id: string) => {
    if (!customer) return;
    const res = await fetch(`/api/email/public/${id}?owner_id=${customer.id}`);
    const data = await res.json();
    setSelectedEmail(data);
  };

  const clearSearch = () => {
    setSearchQ(""); setAdvFrom(""); setAdvTo(""); setAdvSubject(""); setAdvDateFrom(""); setAdvDateTo(""); setLegalOnly(false); setAttOnly(false);
    setPage(1);
    setTimeout(fetchEmails, 100);
  };

  if (loading || !customer) return <div className="p-4 text-white text-center">Loading...</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-extrabold text-white">📧 Email Archive</h1>
        <button onClick={() => router.push("/tools/email-search")} className="bg-white/20 text-white px-2 py-1 rounded-lg text-xs font-bold">📥 Import</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[
          {k:"Sent",l:"📤 Sent"},
          {k:"INBOX",l:"📥 Inbox"},
          {k:"Inbox/COLT",l:"COLT"},
          {k:"Inbox/oracle",l:"Oracle"},
          {k:"Inbox/amazon",l:"Amazon"},
          {k:"Inbox/RTI",l:"RTI"},
          {k:"Inbox/PMO",l:"PMO"},
          {k:"Inbox/MCR",l:"MCR"},
          {k:"Inbox/BSNL",l:"BSNL"},
          {k:"Inbox/HSBC",l:"HSBC"},
          {k:"Inbox/TCS",l:"TCS"},
          {k:"Inbox/EPFO",l:"EPFO"},
          {k:"Inbox/FSSAI",l:"FSSAI"},
          {k:"Inbox/EMPOWER",l:"Empower"},
          {k:"Inbox/Human rights",l:"HR"},
          {k:"Inbox/Loan",l:"Loan"},
          {k:"Archive",l:"📁 Archive"},
          {k:"Draft",l:"📝 Draft"},
        ].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setPage(1); }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${tab === t.k ? "bg-white text-[#F47216] shadow" : "bg-white/15 text-white/80"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-2 shadow space-y-2">
        <div className="flex gap-2">
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()} placeholder="Search emails..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          <button onClick={doSearch} className="bg-[#F47216] text-white px-3 py-2 rounded-lg text-xs font-bold">🔍</button>
          <button onClick={() => setAdvOpen(!advOpen)} className={`px-2 py-2 rounded-lg text-xs font-bold border ${advOpen ? "bg-violet-100 text-violet-700 border-violet-300" : "text-gray-500 border-gray-200"}`}>⚙️</button>
        </div>

        {/* Advanced Search */}
        {advOpen && (
          <div className="border-t pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-bold">From</label>
                <input value={advFrom} onChange={e => setAdvFrom(e.target.value)} placeholder="sender@email.com" className="w-full border rounded p-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold">To</label>
                <input value={advTo} onChange={e => setAdvTo(e.target.value)} placeholder="recipient@email.com" className="w-full border rounded p-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold">Subject</label>
                <input value={advSubject} onChange={e => setAdvSubject(e.target.value)} placeholder="Subject contains..." className="w-full border rounded p-1.5 text-xs" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-bold">From Date</label>
                  <input type="date" value={advDateFrom} onChange={e => setAdvDateFrom(e.target.value)} className="w-full border rounded p-1.5 text-xs" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-bold">To Date</label>
                  <input type="date" value={advDateTo} onChange={e => setAdvDateTo(e.target.value)} className="w-full border rounded p-1.5 text-xs" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={legalOnly} onChange={e => setLegalOnly(e.target.checked)} /> ⚖️ Legal Only</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={attOnly} onChange={e => setAttOnly(e.target.checked)} /> 📎 Has Attachment</label>
              <button onClick={clearSearch} className="text-xs text-red-500 ml-auto">✕ Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-white/60 text-xs">{total} emails {searchQ && `matching "${searchQ}"`}</p>

      {/* Email List */}
      <div className="space-y-2">
        {fetching ? <p className="text-white/60 text-sm text-center py-4">Searching...</p> :
          emails.length === 0 ? <p className="text-white/60 text-sm text-center py-8">No emails found</p> :
          emails.map((em: any) => (
            <div key={em.id} onClick={() => viewEmail(em.id)} className="bg-white rounded-xl p-3 shadow cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">{em.subject || "(No Subject)"}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {tab === "Sent" ? `To: ${em.to_address?.slice(0,50)}` : `From: ${em.from_name || em.from_address?.slice(0,50)}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-[10px] text-gray-400">{em.sent_date ? new Date(em.sent_date).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"2-digit"}) : ""}</span>
                  <div className="flex gap-0.5">
                    {em.is_legal_notice && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded">⚖️</span>}
                    {em.has_attachment && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">📎{em.attachment_count}</span>}
                  </div>
                </div>
              </div>
              {em.snippet && <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{em.snippet}</p>}
            </div>
          ))
        }
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30">← Prev</button>
          <span className="text-white/80 text-xs">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={emails.length < 20} className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30">Next →</button>
        </div>
      )}

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setSelectedEmail(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
              <h3 className="font-bold text-gray-800 text-sm truncate flex-1">{selectedEmail.email?.subject}</h3>
              <button onClick={() => setSelectedEmail(null)} className="text-gray-400 text-xl ml-2">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {/* Headers */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex"><span className="text-gray-500 font-bold w-12">From:</span><span className="text-gray-700 flex-1">{selectedEmail.email?.from_address}</span></div>
                <div className="flex"><span className="text-gray-500 font-bold w-12">To:</span><span className="text-gray-700 flex-1 break-all">{selectedEmail.email?.to_address}</span></div>
                {selectedEmail.email?.cc_address && <div className="flex"><span className="text-gray-500 font-bold w-12">CC:</span><span className="text-gray-700 flex-1 break-all">{selectedEmail.email.cc_address}</span></div>}
                <div className="flex"><span className="text-gray-500 font-bold w-12">Date:</span><span className="text-gray-700">{selectedEmail.email?.sent_date ? new Date(selectedEmail.email.sent_date).toLocaleString("en-IN") : ""}</span></div>
                <div className="flex"><span className="text-gray-500 font-bold w-12">Folder:</span><span className="text-gray-700">{selectedEmail.email?.folder}</span></div>
                {selectedEmail.email?.is_legal_notice && <div className="text-red-600 font-bold">⚖️ LEGAL NOTICE / CONSUMER COMPLAINT</div>}
              </div>

              {/* Attachments */}
              {selectedEmail.attachments?.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="font-bold text-xs text-blue-800 mb-1">📎 Attachments ({selectedEmail.attachments.length})</p>
                  {selectedEmail.attachments.map((att: any, i: number) => (
                    <a key={i} href={att.storage_path} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline py-0.5">
                      📄 {att.filename} ({Math.round((att.size_bytes || 0) / 1024)}KB)
                    </a>
                  ))}
                </div>
              )}

              {/* Body */}
              <div className="border rounded-lg p-3 text-gray-700 text-xs leading-relaxed max-h-[50vh] overflow-y-auto">
                {selectedEmail.email?.body_text ? (
                  <pre className="whitespace-pre-wrap font-sans">{selectedEmail.email.body_text}</pre>
                ) : selectedEmail.email?.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.email.body_html }} />
                ) : (
                  <p className="text-gray-400 italic">No content available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
