import {
  Download,
  Edit,
  Eye,
  Loader2,
  Plus,
  RotateCcw,
  Share,
  X,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuditModal from "../components/AuditModal";
import FileUpload from "../components/FileUpload";
import ShareModal from "../components/ShareModal";
import { getFileUrl } from "../config/environment";
import { AuthContext } from "../context/AuthContext";
import {
  deleteDocument,
  getDocuments,
  getSignaturePosition,
  resetDocument,
} from "../services/api";

import { Page, Document as PdfDocument, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Document {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  filePath: string;
  rejectionReason?: string;
}

const Dashboard = () => {
  const auth = useContext(AuthContext);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDocToShare, setSelectedDocToShare] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedDocForAudit, setSelectedDocForAudit] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // NEW: Track which specific document is currently checking the DB
  const [sharingDocId, setSharingDocId] = useState<string | null>(null);

  const fetchDocs = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;
    try {
      await deleteDocument(id);
      fetchDocs();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleReset = async (id: string) => {
    if (
      !window.confirm(
        "This will reset the document back to Draft status. Continue?",
      )
    )
      return;
    try {
      await resetDocument(id);
      fetchDocs();
    } catch (err) {
      alert("Failed to reset");
    }
  };

  const handleView = (filePath: string) => {
    window.open(getFileUrl(filePath), "_blank");
  };

  const handleDownload = (filePath: string, title: string) => {
    const link = document.createElement("a");
    link.href = getFileUrl(filePath);
    link.download = title;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // UPDATED: Now sets a loading state while fetching from the DB
  const handleOpenShare = async (id: string, title: string) => {
    setSharingDocId(id); // Start loading spinner for this specific card
    try {
      const sigRes = await getSignaturePosition(id);
      if (!sigRes || sigRes.x === undefined) {
        alert(
          "SECURITY LOCK: You must open the Editor and lock a Signature Position before dispatching this document.",
        );
        return;
      }
      setSelectedDocToShare({ id, title });
      setIsShareModalOpen(true);
    } catch (err) {
      alert(
        "SECURITY LOCK: You must open the Editor and lock a Signature Position before dispatching this document.",
      );
    } finally {
      setSharingDocId(null); // Stop loading spinner
    }
  };

  const openAuditModal = (id: string, title: string) => {
    setSelectedDocForAudit({ id, title });
    setIsAuditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-bone text-ink p-8 md:p-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-brutal border-ink pb-6 mb-12 max-w-7xl mx-auto">
        <div>
          <h1 className="text-6xl md:text-8xl font-serif font-extrabold tracking-tighter uppercase leading-none">
            SIGNVERIF
          </h1>
          <p className="font-mono text-sm font-bold tracking-widest uppercase mt-2 opacity-80">
            Document Storage & Execution
          </p>
        </div>

        <div className="text-right flex flex-col items-end mt-6 md:mt-0">
          <span className="font-mono text-sm font-bold bg-ink text-bone px-3 py-1 mb-3 uppercase shadow-brutal border-brutal border-ink">
            ID: {auth?.user?.name || "USER"}
          </span>
          <button
            onClick={auth?.logout}
            className="text-xs font-mono font-bold hover:text-signal transition-colors uppercase flex items-center gap-1 bg-white border-brutal border-ink px-2 py-1 hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal active:shadow-none"
          >
            <X size={14} strokeWidth={3} /> Terminate Session
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {documents.length === 0 ? (
          <div className="w-full border-brutal border-ink bg-white shadow-brutal p-12 md:p-32 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal-hover">
            <Plus size={100} className="text-signal mb-8" strokeWidth={1} />
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 uppercase tracking-tight">
              Upload New Document
            </h2>
            <p className="font-mono text-sm uppercase max-w-md mb-12 opacity-80">
              Upload a secure PDF document to initialize the signature workflow.
            </p>
            <div className="w-full max-w-lg">
              <FileUpload onUploadSuccess={fetchDocs} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border-brutal border-ink bg-white p-6 flex flex-col items-center justify-center min-h-100 shadow-brutal transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal-hover">
              <Plus size={48} strokeWidth={2} className="mb-4 text-signal" />
              <h3 className="font-sans font-bold text-2xl uppercase tracking-widest text-center mb-6">
                New Document
              </h3>
              <div className="w-full">
                <FileUpload onUploadSuccess={fetchDocs} />
              </div>
            </div>

            {documents.map((doc) => (
              <div
                key={doc._id}
                className="group border-brutal border-ink bg-white flex flex-col min-h-100 shadow-brutal transition-all duration-200 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal-hover relative"
              >
                <div className="h-48 bg-bone border-b-brutal border-ink p-4 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex justify-between items-start w-full z-20 relative">
                    <div className="font-mono text-[10px] uppercase font-bold tracking-widest leading-tight opacity-50 bg-white border-brutal border-ink p-1">
                      SYS.ID: {doc._id.slice(-6)}
                    </div>
                    <div
                      className={`font-mono text-xs font-bold border-brutal border-ink px-2 py-1 uppercase shadow-brutal-active ${
                        doc.status === "Signed"
                          ? "bg-ink text-bone"
                          : doc.status === "Rejected"
                            ? "bg-signal text-white"
                            : "bg-white text-ink"
                      }`}
                    >
                      STATUS: {doc.status}
                    </div>
                  </div>

                  <div className="absolute top-12 left-0 right-0 bottom-0 flex justify-center overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    <PdfDocument file={getFileUrl(doc.filePath)} loading={null}>
                      <Page
                        pageNumber={1}
                        width={250}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </PdfDocument>
                  </div>

                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none z-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between bg-white z-20">
                  <div>
                    <h3 className="font-serif text-2xl font-bold leading-tight line-clamp-2 uppercase mb-2">
                      {doc.title.replace(".pdf", "")}
                    </h3>

                    <div className="font-mono text-[10px] font-bold text-ink/60 uppercase mt-2">
                      INIT:{" "}
                      {new Date(doc.createdAt).toISOString().split("T")[0]}
                    </div>

                    {doc.status === "Rejected" && doc.rejectionReason && (
                      <div className="font-mono text-xs bg-ink text-signal p-3 mt-4 uppercase border-brutal border-signal">
                        REASON: {doc.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 mt-6 pt-4 border-t-brutal border-ink">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(doc.filePath)}
                        className="flex-1 bg-white border-brutal border-ink font-mono text-xs font-bold py-2 uppercase hover:bg-bone transition-colors flex items-center justify-center gap-1 shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:shadow-none"
                      >
                        <Eye size={14} strokeWidth={2.5} /> View
                      </button>

                      {doc.status !== "Signed" && doc.status !== "Rejected" && (
                        <Link
                          to={`/document/${doc._id}`}
                          className="flex-1 bg-ink text-bone border-brutal border-ink font-mono text-xs font-bold py-2 text-center uppercase hover:bg-signal transition-colors flex items-center justify-center gap-1 shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:shadow-none"
                        >
                          <Edit size={14} strokeWidth={2.5} /> Editor
                        </Link>
                      )}

                      {doc.status === "Signed" && (
                        <button
                          onClick={() =>
                            handleDownload(doc.filePath, doc.title)
                          }
                          className="flex-1 bg-signal text-white border-brutal border-ink font-mono text-xs font-bold py-2 uppercase transition-colors flex items-center justify-center gap-1 shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:shadow-none"
                        >
                          <Download size={14} strokeWidth={2.5} /> Get PDF
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <div className="flex gap-2">
                        {(doc.status === "Draft" ||
                          doc.status === "Pending") && (
                          <button
                            onClick={() => handleOpenShare(doc._id, doc.title)}
                            disabled={sharingDocId === doc._id}
                            className="p-2 border-brutal border-ink bg-white transition-all shadow-brutal active:shadow-none flex items-center justify-center hover:bg-bone hover:-translate-y-0.5 hover:-translate-x-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Dispatch Request"
                          >
                            {/* UPDATED: Spin if this document is the one currently checking DB */}
                            {sharingDocId === doc._id ? (
                              <Loader2
                                size={16}
                                strokeWidth={2.5}
                                className="animate-spin text-signal"
                              />
                            ) : (
                              <Share size={16} strokeWidth={2.5} />
                            )}
                          </button>
                        )}

                        {(doc.status === "Signed" ||
                          doc.status === "Rejected") && (
                          <button
                            onClick={() => handleReset(doc._id)}
                            className="p-2 border-brutal border-ink bg-white hover:bg-signal hover:text-white transition-colors flex items-center justify-center shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:shadow-none"
                            title="Reset to Draft"
                          >
                            <RotateCcw size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openAuditModal(doc._id, doc.title)}
                          className="font-mono text-[10px] font-bold border-brutal border-ink px-2 py-2 uppercase hover:bg-ink hover:text-bone transition-colors"
                          title="Audit Trail"
                        >
                          LOG
                        </button>

                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="font-mono text-[10px] font-bold border-brutal border-ink px-2 py-2 uppercase text-signal hover:bg-signal hover:text-white transition-colors"
                          title="Delete"
                        >
                          DEL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={selectedDocToShare?.id || null}
        documentTitle={selectedDocToShare?.title || ""}
        onSuccess={fetchDocs}
      />
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        documentId={selectedDocForAudit?.id || null}
        documentTitle={selectedDocForAudit?.title || ""}
      />
    </div>
  );
};

export default Dashboard;
