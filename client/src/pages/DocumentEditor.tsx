import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArrowLeft, CheckCircle, Download, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useNavigate, useParams } from "react-router-dom";
import DraggableSignature from "../components/DraggableSignature";
import SignatureModal from "../components/SignatureModal";
import { getFileUrl } from "../config/environment";
import API, {
  getSignaturePosition,
  saveSignaturePosition,
  signDocument,
} from "../services/api";

// Styles & Worker
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const HANDLE_HEIGHT = 24; // Matches the h-6 class in DraggableSignature

const DocumentEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  // State
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 192, height: 64 });
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  // Page Dimensions (Used for Scaling) - NOW SET TO 800 BY DEFAULT
  const [pageDetails, setPageDetails] = useState({ width: 800, height: 1131 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [docStatus, setDocStatus] = useState("Draft");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // HUD Crosshair state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const docRes = await API.get(`/documents/${id}`);
        setPdfPath(getFileUrl(docRes.data.filePath));
        setDocStatus(docRes.data.status);

        const sigRes = await getSignaturePosition(id!);
        if (sigRes) {
          if (sigRes.x !== undefined) setPosition({ x: sigRes.x, y: sigRes.y });
          if (sigRes.width !== undefined)
            setSize({ width: sigRes.width, height: sigRes.height });
          if (sigRes.signatureImage) setSignatureImage(sigRes.signatureImage);
        }
      } catch (error) {
        console.error("Failed to load data", error);
      }
    };
    if (id) loadData();
  }, [id]);

  // Capture Page Dimensions when PDF loads
  const onPageLoadSuccess = (page: any) => {
    setPageDetails({ width: page.width, height: page.height });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (docStatus === "Signed") return;
    const { delta } = event;
    setPosition((prev) => ({
      x: prev.x + delta.x,
      y: prev.y + delta.y,
    }));
  };

  const handleSavePosition = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await saveSignaturePosition({
        documentId: id,
        x: position.x,
        y: position.y + HANDLE_HEIGHT,
        width: size.width,
        height: size.height,
        signatureImage: signatureImage,
        pageNumber: 1,
        // MUST MATCH THE RENDERED <Page width={800}> BELOW
        viewportWidth: 800,
        viewportHeight: pageDetails.height,
      });
      alert("Signature position saved!");
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!id) return;
    if (!signatureImage) {
      alert("Create a signature first!");
      return;
    }
    if (!window.confirm("Permanently sign PDF?")) return;

    setIsSigning(true);
    try {
      await signDocument(id, signatureImage);
      alert("Signed Successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Signing failed", error);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = () => {
    if (pdfPath) {
      const link = document.createElement("a");
      link.href = pdfPath;
      link.download = `Signed_Document.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle global mouse tracking for the Blueprint HUD
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-bone text-ink relative font-sans overflow-hidden cursor-crosshair selection:bg-signal selection:text-white">
      {/* THE BLUEPRINT HUD: Crosshairs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute bg-ink/30 w-px h-full transition-opacity"
          style={{ left: `${mousePos.x}px` }}
        />
        <div
          className="absolute bg-ink/30 h-px w-full transition-opacity"
          style={{ top: `${mousePos.y}px` }}
        />
        <div
          className="absolute font-mono text-[10px] font-bold bg-ink text-bone px-2 py-1 uppercase mt-2 ml-2 shadow-brutal"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
        >
          X:{mousePos.x} Y:{mousePos.y}
        </div>
      </div>

      {/* HEADER: Minimalist Top Bar */}
      <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-40 bg-bone/90 backdrop-blur-sm border-b-brutal border-ink">
        <button
          onClick={() => navigate("/dashboard")}
          className="font-mono text-sm font-bold flex items-center gap-2 uppercase hover:text-signal transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={3} /> Return to Archive
        </button>
        <div className="text-right">
          <h1 className="font-serif text-2xl font-bold uppercase tracking-tight">
            {docStatus === "Signed" ? "Executed Document" : "Document Editor"}
          </h1>
          <p className="font-mono text-[10px] uppercase font-bold text-ink/60">
            SYS.ID: {id?.slice(-8)}
          </p>
        </div>
      </header>

      {/* WORKSPACE: Infinite Field */}
      <main className="pt-32 pb-40 flex justify-center items-start min-h-screen z-10 relative">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="relative bg-white border-brutal border-ink shadow-brutal select-none transition-transform">
            {/* Faint Grid Overlay on the PDF */}
            <div
              className="absolute inset-0 z-20 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Actual PDF Document */}
            {pdfPath ? (
              <Document file={pdfPath} className="z-10 relative">
                <Page
                  pageNumber={1}
                  width={800} // FIXED: Now strictly 800 to match PublicSign.tsx
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="border-none"
                />

                {/* DRAGGABLE BLOCK */}
                {docStatus !== "Signed" && (
                  <DraggableSignature
                    id="signature-1"
                    initialPos={position}
                    initialSize={size}
                    imageUrl={signatureImage}
                    onClick={() => setIsModalOpen(true)}
                    onSizeChange={(w, h) => setSize({ width: w, height: h })}
                  />
                )}
              </Document>
            ) : (
              <div className="p-12 w-200 text-center font-mono text-sm font-bold uppercase text-ink/60">
                Loading Document...
              </div>
            )}
          </div>
        </DndContext>
      </main>

      {/* THE FINALIZE DOCK: Fixed Bottom Right */}
      <div className="fixed bottom-8 right-8 z-50 bg-white border-brutal border-ink p-6 shadow-brutal flex flex-col gap-4 min-w-75">
        <div>
          <h3 className="font-serif font-bold text-xl uppercase mb-1 border-b-brutal border-ink pb-2">
            Execution Dock
          </h3>
          <div className="font-mono text-xs font-bold uppercase flex justify-between mt-3 opacity-80">
            <span>SIG.X: {Math.round(position.x)}</span>
            <span>SIG.Y: {Math.round(position.y)}</span>
          </div>
        </div>

        {docStatus !== "Signed" ? (
          <>
            <button
              onClick={handleSavePosition}
              disabled={isSaving || isSigning}
              className="w-full bg-ink text-bone font-mono font-bold text-sm py-3 border-brutal border-ink uppercase tracking-widest shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                "LOCKING..."
              ) : (
                <>
                  <Save size={16} strokeWidth={2.5} /> Save Coordinates
                </>
              )}
            </button>
            <button
              onClick={handleFinalize}
              disabled={isSaving || isSigning}
              className="w-full bg-signal text-white font-mono font-bold text-sm py-4 border-brutal border-ink uppercase tracking-widest shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning ? (
                "PROCESSING..."
              ) : (
                <>
                  <CheckCircle size={18} strokeWidth={2.5} /> Finalize & Sign
                </>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleDownload}
            className="w-full bg-white text-ink font-mono font-bold text-sm py-4 border-brutal border-ink uppercase tracking-widest shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Download size={18} strokeWidth={2.5} /> Retrieve PDF
          </button>
        )}
      </div>

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => setSignatureImage(data)}
      />
    </div>
  );
};

export default DocumentEditor;
