import { FileText, Globe, Monitor, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle: string;
}

const AuditModal = ({ isOpen, onClose, documentId, documentTitle }: Props) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!documentId) return;
      setIsLoading(true);
      try {
        const data = await getAuditLogs(documentId);
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) fetchLogs();
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bone/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans selection:bg-signal selection:text-white">
      <div className="bg-white border-brutal border-ink shadow-brutal w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-start p-6 border-b-brutal border-ink bg-white">
          <div>
            <h3 className="font-serif text-3xl font-extrabold uppercase tracking-tight leading-none text-ink mb-2">
              Audit Ledger
            </h3>
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60 bg-bone border-brutal border-ink inline-flex px-2 py-1 gap-2 items-center">
              <FileText size={12} strokeWidth={3} />{" "}
              {documentTitle.replace(".pdf", "")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border-brutal border-transparent hover:border-ink hover:bg-bone transition-colors"
          >
            <X size={24} strokeWidth={2.5} className="text-ink" />
          </button>
        </div>

        {/* LOG CONTENT */}
        <div className="p-8 bg-bone overflow-y-auto flex-1 relative">
          {isLoading ? (
            <div className="font-mono text-sm font-bold uppercase text-center py-12 animate-pulse">
              Retrieving Records...
            </div>
          ) : logs.length === 0 ? (
            <div className="font-mono text-sm font-bold uppercase text-center py-12 opacity-50">
              No events recorded.
            </div>
          ) : (
            <div className="relative border-l-brutal border-ink ml-4 md:ml-8 pb-4">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="relative pl-8 md:pl-12 mb-10 last:mb-0 group"
                >
                  {/* The Node (Square instead of circle for Brutalism) */}
                  <div
                    className={`absolute -left-[11.5px] top-0 w-5 h-5 border-brutal border-ink transition-colors duration-300 ${
                      log.action === "Signed"
                        ? "bg-signal"
                        : log.action === "Rejected"
                          ? "bg-ink"
                          : "bg-white group-hover:bg-bone"
                    }`}
                  />

                  {/* The Log Card */}
                  <div className="bg-white border-brutal border-ink p-5 shadow-brutal hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2 border-b-brutal border-ink pb-4">
                      <span
                        className={`font-serif text-2xl font-extrabold uppercase leading-none tracking-tight ${
                          log.action === "Signed"
                            ? "text-signal"
                            : log.action === "Rejected"
                              ? "text-signal line-through decoration-4"
                              : "text-ink"
                        }`}
                      >
                        {log.action}
                      </span>
                      <div className="font-mono text-[10px] font-bold uppercase bg-bone px-2 py-1 border-brutal border-ink whitespace-nowrap">
                        <span className="opacity-50 mr-2">TIME:</span>
                        {new Date(log.createdAt)
                          .toLocaleString("en-US", { hour12: false })
                          .replace(",", "")}
                      </div>
                    </div>

                    <p className="font-sans font-bold text-lg mb-4 uppercase leading-tight">
                      {log.details}
                    </p>

                    {/* Machine Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/80 bg-bone border-brutal border-ink p-3">
                      <div
                        className="flex items-center gap-2 overflow-hidden"
                        title={log.userEmail}
                      >
                        <User size={12} strokeWidth={3} className="shrink-0" />
                        <span className="truncate border-l-2 border-ink/20 pl-2">
                          USR: {log.userEmail}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 overflow-hidden"
                        title={log.ipAddress}
                      >
                        <Globe size={12} strokeWidth={3} className="shrink-0" />
                        <span className="truncate border-l-2 border-ink/20 pl-2">
                          IP: {log.ipAddress}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 overflow-hidden"
                        title={log.userAgent}
                      >
                        <Monitor
                          size={12}
                          strokeWidth={3}
                          className="shrink-0 text-signal"
                        />
                        <span className="truncate border-l-2 border-ink/20 pl-2 text-signal">
                          SYS: {log.userAgent.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditModal;
