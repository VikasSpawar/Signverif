import { Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { shareDocument } from "../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle: string;
  onSuccess: () => void;
}

const ShareModal = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onSuccess,
}: Props) => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);

  if (!isOpen || !documentId) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter an email address.");
      return;
    }

    setIsSending(true);
    setError("");
    setEmailError(false);

    try {
      // We only send the email now, backend handles the rest!
      const response = await shareDocument(documentId, email);
      
      if (response.emailError) {
        // Email failed but document was shared
        setEmailError(true);
        alert(
          `⚠️ Document was shared, but email delivery failed.\n\nReason: ${response.message}\n\nShare this link manually:\n${response.signLink}`,
        );
      } else {
        alert(
          `✅ Success! Signature request sent to ${email}`,
        );
      }
      
      setEmail("");
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to send share request.";
      setError(errorMsg);
      
      // Also check if it's an email-specific error
      if (errorMsg.includes('email') || errorMsg.includes('Email') || errorMsg.includes('mail')) {
        setEmailError(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bone/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans selection:bg-signal selection:text-white">
      <div className="bg-white border-brutal border-ink shadow-brutal w-full max-w-md flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-start p-6 border-b-brutal border-ink bg-bone">
          <div>
            <h3 className="font-serif text-3xl font-extrabold uppercase tracking-tight leading-none text-ink mb-1">
              Dispatch
            </h3>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
              Request Signature
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 border-brutal border-transparent hover:border-ink hover:bg-white transition-colors"
          >
            <X size={24} strokeWidth={2.5} className="text-ink" />
          </button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleShare} className="flex flex-col">
          <div className="p-6 md:p-8 bg-white">
            <p className="font-mono text-xs font-bold uppercase mb-6 tracking-widest leading-relaxed text-ink/80 border-b-2 border-ink/10 pb-4">
              Document:{" "}
              <span className="text-ink">
                {documentTitle.replace(".pdf", "")}
              </span>
            </p>

            <div className="mb-6">
              <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                required
                placeholder="SIGNER@EXAMPLE.COM"
                className="w-full p-4 border-brutal border-ink font-mono text-sm focus:outline-none focus:ring-0 focus:border-signal focus:shadow-brutal-active transition-all placeholder:text-ink/30 uppercase"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
              />
            </div>

            <div className="bg-bone border-brutal border-ink p-4 flex gap-3 items-start">
              <ShieldCheck
                className="text-ink shrink-0"
                size={18}
                strokeWidth={2.5}
              />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80 leading-relaxed">
                For security, an automated 6-digit Access Code will be generated
                and sent to the recipient separately.
              </p>
            </div>

            {error && (
              <div className={`${emailError ? 'bg-signal' : 'bg-ink'} ${emailError ? 'text-white' : 'text-signal'} p-3 mt-6 border-brutal ${emailError ? 'border-signal' : 'border-signal'} font-mono text-xs font-bold uppercase shadow-brutal-active`}>
                <div className="font-black mb-2">
                  {emailError ? '⚠️ EMAIL ERROR' : '❌ ERROR'}
                </div>
                {error}
                {emailError && (
                  <div className="mt-2 text-xs font-normal opacity-90">
                    <p>Possible causes:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Email service not configured on server</li>
                      <li>Gmail credentials incorrect</li>
                      <li>Gmail App Password not used</li>
                    </ul>
                    <p className="mt-2">Check server logs or contact admin.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTION DOCK */}
          <div className="p-6 border-t-brutal border-ink bg-white flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-6 py-3 font-mono text-sm font-bold uppercase border-brutal border-ink bg-white text-ink hover:bg-ink hover:text-bone transition-colors shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0 active:translate-x-0 active:shadow-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 bg-signal text-white font-mono text-sm font-bold py-3 uppercase tracking-widest border-brutal border-ink shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                "TRANSMITTING..."
              ) : (
                <>
                  <Send size={16} strokeWidth={2.5} /> Send Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;
