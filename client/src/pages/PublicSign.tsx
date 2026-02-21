

import {
  AlertCircle,
  ArrowDown,
  CheckCircle,
  Lock,
  Mail,
  PenTool,
  Unlock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useParams } from "react-router-dom";
import SignatureModal from "../components/SignatureModal";
import { getFileUrl } from "../config/environment";
import {
  getSharedDocument,
  rejectSharedDocument,
  requestOTP,
  signSharedDocument,
  unlockSharedDocument,
} from "../services/api";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PublicSign = () => {
  const { token } = useParams<{ token: string }>();

  // Logic States
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [docDetails, setDocDetails] = useState<any>(null);
  const [sigPos, setSigPos] = useState<any>(null);

  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isRejected, setIsRejected] = useState(false);

  // 1. Initial Load: Check SessionStorage
  useEffect(() => {
    const initLoad = async () => {
      const savedPin = sessionStorage.getItem(`unlock_pin_${token}`);
      if (savedPin) {
        try {
          const data = await unlockSharedDocument(token!, savedPin);
          setDocTitle(data.document.title);
          setDocDetails(data.document);
          setSigPos(data.signaturePosition);
          setIsLocked(false);
          return;
        } catch (e) {
          sessionStorage.removeItem(`unlock_pin_${token}`);
        }
      }

      try {
        const data = await getSharedDocument(token!);
        setDocTitle(data.title);
        setMaskedEmail(data.maskedEmail);
        setIsLocked(data.requiresOtp);
      } catch (err: any) {
        setError(err.response?.data?.message || "Invalid or expired link");
      }
    };
    if (token) initLoad();
  }, [token]);

  // 2. Request OTP
  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    setUnlockError("");
    try {
      await requestOTP(token!);
      setIsOtpSent(true);
      setPinInput("");
    } catch (err: any) {
      setUnlockError("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 3. Unlock Document
  const handleUnlock = async (pinToUse: string) => {
    if (!pinToUse) {
      setUnlockError("Please enter the access code.");
      return;
    }
    setUnlockError("");
    try {
      const data = await unlockSharedDocument(token!, pinToUse);
      setDocDetails(data.document);
      setSigPos(data.signaturePosition);
      setIsLocked(false);
      sessionStorage.setItem(`unlock_pin_${token}`, pinToUse);
    } catch (err: any) {
      setUnlockError(
        err.response?.data?.message || "Failed to unlock document",
      );
    }
  };

  // 4. Finalize
  const handleFinalize = async () => {
    if (!signatureImage) {
      alert("Please click the signature box to sign first.");
      return;
    }
    setIsSigning(true);
    try {
      await signSharedDocument(token!, signatureImage);
      setIsSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to sign document");
    } finally {
      setIsSigning(false);
    }
  };

  // 5. Reject
  const handleReject = async () => {
    const reason = window.prompt(
      "Please provide a reason for declining to sign this document:",
    );
    if (!reason) return;

    try {
      await rejectSharedDocument(token!, reason);
      setIsRejected(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject document");
    }
  };

  // --- RENDERING ERROR & SUCCESS SCREENS (The "Stamped" Look) ---

  if (error) {
    return (
      <div className="min-h-screen bg-bone text-ink flex flex-col items-center justify-center p-4 selection:bg-signal selection:text-white">
        <div className="border-brutal border-ink bg-white p-12 shadow-brutal text-center max-w-lg w-full">
          <h2 className="text-5xl font-serif font-extrabold text-signal uppercase tracking-tighter mb-4">
            Access Denied
          </h2>
          <div className="font-mono text-sm font-bold bg-ink text-bone p-4 uppercase border-brutal border-ink">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bone text-ink flex flex-col items-center justify-center p-4 selection:bg-signal selection:text-white">
        <div className="border-brutal border-ink bg-white p-16 shadow-brutal text-center max-w-2xl w-full relative overflow-hidden">
          {/* Faint background stamp effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] text-ink/5 text-[150px] font-serif font-extrabold uppercase pointer-events-none whitespace-nowrap">
            Signed
          </div>
          <CheckCircle
            size={80}
            strokeWidth={1.5}
            className="text-ink mx-auto mb-6 relative z-10"
          />
          <h2 className="text-6xl font-serif font-extrabold text-ink uppercase tracking-tighter mb-6 relative z-10">
            Success
          </h2>
          <p className="font-mono text-sm font-bold uppercase tracking-widest opacity-80 border-t-brutal border-ink pt-6 mt-6 relative z-10">
            The document has been securely signed.
            <br />
            The owner has been notified.
          </p>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="min-h-screen bg-bone text-ink flex flex-col items-center justify-center p-4 selection:bg-signal selection:text-white">
        <div className="border-brutal border-ink bg-white p-16 shadow-brutal text-center max-w-2xl w-full relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] text-signal/5 text-[150px] font-serif font-extrabold uppercase pointer-events-none whitespace-nowrap">
            Declined
          </div>
          <AlertCircle
            size={80}
            strokeWidth={1.5}
            className="text-signal mx-auto mb-6 relative z-10"
          />
          <h2 className="text-6xl font-serif font-extrabold text-signal uppercase tracking-tighter mb-6 relative z-10">
            Declined
          </h2>
          <p className="font-mono text-sm font-bold uppercase tracking-widest opacity-80 border-t-brutal border-ink pt-6 mt-6 relative z-10">
            You have successfully declined this document.
            <br />
            Your reason has been recorded and transmitted.
          </p>
        </div>
      </div>
    );
  }

  // --- RENDERING THE LOCK SCREEN ---

  if (isLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bone text-ink p-4 selection:bg-signal selection:text-white">
        <div className="bg-white border-brutal border-ink p-10 shadow-brutal max-w-md w-full">
          <div className="flex justify-between items-start mb-8 border-b-brutal border-ink pb-6">
            <div>
              <h2 className="text-3xl font-serif font-extrabold uppercase tracking-tight leading-none mb-1">
                Protected
              </h2>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
                Secure Document
              </p>
            </div>
            <Lock size={32} strokeWidth={2} className="text-ink" />
          </div>

          <p className="font-mono text-sm font-bold uppercase mb-8 leading-relaxed">
            Security verification required to view:
            <br />
            <span className="bg-ink text-bone px-1">
              {docTitle.replace(".pdf", "")}
            </span>
          </p>

          {!isOtpSent ? (
            <div className="border-t-brutal border-ink pt-6">
              <p className="font-mono text-xs font-bold uppercase mb-4 text-center">
                Send secure access code to:
                <br />
                <span className="text-lg underline underline-offset-4">
                  {maskedEmail}
                </span>
              </p>
              <button
                onClick={handleRequestOtp}
                disabled={isSendingOtp}
                className="w-full bg-ink text-bone font-mono font-bold text-sm py-4 border-brutal border-ink uppercase tracking-widest shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingOtp ? (
                  "SENDING..."
                ) : (
                  <>
                    <Mail size={18} /> Send Access Code
                  </>
                )}
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnlock(pinInput);
              }}
              className="border-t-brutal border-ink pt-6"
            >
              <div className="bg-ink text-bone p-2 mb-6 font-mono text-[10px] font-bold uppercase flex items-center gap-2">
                <CheckCircle size={14} /> Code sent to {maskedEmail}
              </div>

              <input
                type="text"
                placeholder="000000"
                className="w-full p-4 border-brutal border-ink text-center text-3xl font-mono font-bold tracking-[0.5em] uppercase focus:outline-none focus:ring-0 focus:border-signal focus:shadow-brutal-active mb-2 transition-shadow"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={6}
              />

              {unlockError && (
                <p className="text-signal font-mono text-xs font-bold uppercase mt-2 bg-signal/10 p-2 border border-signal">
                  {unlockError}
                </p>
              )}

              <button
                type="submit"
                className="w-full mt-6 bg-signal text-white font-mono font-bold text-sm py-4 border-brutal border-ink uppercase tracking-widest shadow-brutal hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Unlock size={18} /> Unlock Document
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isSendingOtp}
                className="w-full mt-4 font-mono text-xs font-bold uppercase text-ink/60 hover:text-ink transition-colors disabled:opacity-50"
              >
                {isSendingOtp ? "SENDING..." : "[ REQUEST NEW CODE ]"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- RENDERING THE MAIN EDITOR ---

  return (
    <div className="flex flex-col items-center bg-bone text-ink min-h-screen p-4 md:p-8 font-sans selection:bg-signal selection:text-white">
      {/* ABSOLUTE FOCUS HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-5xl mb-8 bg-white border-brutal border-ink p-6 shadow-brutal">
        <div className="mb-6 md:mb-0 text-center md:text-left">
          <h2 className="text-4xl font-serif font-extrabold uppercase tracking-tighter leading-none mb-2">
            Signature Required
          </h2>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            Document:{" "}
            <span className="text-ink">{docTitle.replace(".pdf", "")}</span>
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={handleReject}
            disabled={isSigning}
            className="px-6 py-3 font-mono text-sm font-bold uppercase border-brutal border-ink bg-white text-ink hover:bg-ink hover:text-bone transition-colors shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:shadow-none active:translate-y-0 active:translate-x-0 w-full md:w-auto"
          >
            Decline to Sign
          </button>

          <button
            onClick={handleFinalize}
            disabled={isSigning || !signatureImage}
            className={`px-8 py-3 font-mono text-sm font-bold uppercase border-brutal border-ink transition-all shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:shadow-none active:translate-y-0 active:translate-x-0 w-full md:w-auto flex justify-center items-center gap-2 ${
              !signatureImage
                ? "bg-bone text-ink/40 border-ink/40 cursor-not-allowed shadow-none hover:translate-x-0 hover:translate-y-0"
                : "bg-signal text-white"
            }`}
          >
            {isSigning ? "PROCESSING..." : "Finalize Document"}
          </button>
        </div>
      </div>

      {/* THE DOCUMENT CANVAS */}
      <div className="bg-white border-brutal border-ink shadow-brutal p-2 md:p-8 relative inline-block select-none mb-20">
        {docDetails?.filePath ? (
          <Document
            file={getFileUrl(docDetails.filePath)}
            className="border-brutal border-ink relative"
          >
            <div className="relative">
              <Page
                pageNumber={1}
                width={800}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {sigPos && (
                <div
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    position: "absolute",
                    left: `${sigPos.x}px`,
                    top: `${sigPos.y}px`,
                    width: `${sigPos.width}px`,
                    height: `${sigPos.height}px`,
                  }}
                  className={`border-brutal cursor-pointer flex items-center justify-center transition-all group ${
                    signatureImage
                      ? "border-transparent"
                      : "border-signal bg-signal/10 hover:bg-signal/20"
                  }`}
                >
                  {/* The "Sign Here" Indicator Flag */}
                  {!signatureImage && (
                    <div className="absolute -left-35 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-pulse">
                      <div className="bg-signal text-white font-mono font-bold text-xs uppercase px-3 py-1 border-brutal border-ink shadow-brutal">
                        Sign Here
                      </div>
                      <ArrowDown
                        size={24}
                        className="text-signal -rotate-90"
                        strokeWidth={3}
                      />
                    </div>
                  )}

                  {signatureImage ? (
                    <img
                      src={signatureImage}
                      alt="Your Signature"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-signal font-mono font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                      <PenTool size={16} /> Click to Sign
                    </span>
                  )}
                </div>
              )}
            </div>
          </Document>
        ) : (
          <p className="font-mono text-sm font-bold uppercase p-12 text-center">
            Loading Document Data...
          </p>
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

export default PublicSign;
