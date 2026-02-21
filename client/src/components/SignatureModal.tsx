import { Check, PenTool, Trash2, Type, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

const SignatureModal = ({ isOpen, onClose, onSave }: Props) => {
  const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">(
    "draw",
  );
  const sigCanvas = useRef<SignatureCanvas>(null);

  const [typedName, setTypedName] = useState("");
  const [font, setFont] = useState("serif");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClear = () => sigCanvas.current?.clear();

  // FIX 2: Handle All Formats & Max Size
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Max Size Check (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please upload an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Convert everything to PNG using a canvas
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // This ensures we always have a valid PNG for the backend
          setUploadedImage(canvas.toDataURL("image/png"));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFinish = () => {
    let signatureData = "";

    if (activeTab === "draw") {
      if (sigCanvas.current?.isEmpty()) {
        alert("Please draw a signature first");
        return;
      }
      // FIX 1: Use getCanvas() instead of getTrimmedCanvas() to prevent crash
      // We manually convert to Data URL
      const canvas = sigCanvas.current?.getCanvas();
      if (canvas) {
        signatureData = canvas.toDataURL("image/png");
      }
    } else if (activeTab === "type") {
      if (!typedName) {
        alert("Please enter a name");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 600; // Wider canvas for names
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Map UI font to actual canvas font string
        let canvasFont = '"Playfair Display", serif';
        if (font === "cursive") canvasFont = "cursive";
        if (font === "monospace") canvasFont = '"JetBrains Mono", monospace';

        ctx.font = `60px ${canvasFont}`;
        ctx.fillStyle = "black"; // Switched to black to match the Ink theme
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(typedName, 300, 75); // Centered in the 600x150 canvas
        signatureData = canvas.toDataURL("image/png");
      }
    } else if (activeTab === "upload") {
      if (!uploadedImage) {
        alert("Please upload an image first");
        return;
      }
      signatureData = uploadedImage;
    }

    onSave(signatureData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-bone/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans selection:bg-signal selection:text-white">
      <div className="bg-white border-brutal border-ink shadow-brutal w-full max-w-2xl flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b-brutal border-ink bg-bone">
          <h3 className="font-serif text-3xl font-extrabold uppercase tracking-tight leading-none text-ink">
            Apply Ink
          </h3>
          <button
            onClick={onClose}
            className="p-2 border-brutal border-transparent hover:border-ink hover:bg-white transition-colors"
          >
            <X size={24} strokeWidth={2.5} className="text-ink" />
          </button>
        </div>

        {/* BRUTALIST TABS */}
        <div className="flex border-b-brutal border-ink bg-white font-mono text-sm font-bold uppercase">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-4 border-r-brutal border-ink transition-colors ${activeTab === "draw" ? "bg-ink text-bone shadow-[inset_0_4px_0_0_#FF4F00]" : "bg-white text-ink hover:bg-bone"}`}
            onClick={() => setActiveTab("draw")}
          >
            <PenTool size={16} strokeWidth={3} /> Draw
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-4 border-r-brutal border-ink transition-colors ${activeTab === "type" ? "bg-ink text-bone shadow-[inset_0_4px_0_0_#FF4F00]" : "bg-white text-ink hover:bg-bone"}`}
            onClick={() => setActiveTab("type")}
          >
            <Type size={16} strokeWidth={3} /> Type
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${activeTab === "upload" ? "bg-ink text-bone shadow-[inset_0_4px_0_0_#FF4F00]" : "bg-white text-ink hover:bg-bone"}`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={16} strokeWidth={3} /> Upload
          </button>
        </div>

        {/* WORKSPACE */}
        <div className="p-8 bg-bone h-72 flex flex-col justify-center">
          {activeTab === "draw" && (
            <div className="w-full h-full border-brutal border-ink bg-white relative cursor-crosshair">
              {/* Faint signature line */}
              <div className="absolute bottom-6 left-6 right-6 border-b-2 border-dashed border-ink/20 pointer-events-none" />
              <div className="absolute bottom-1 left-6 font-mono text-[10px] font-bold text-ink/40 uppercase pointer-events-none">
                Sign Above Line
              </div>

              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                minWidth={2}
                maxWidth={4}
                velocityFilterWeight={0.7}
                canvasProps={{ className: "w-full h-full" }}
              />

              <button
                onClick={handleClear}
                className="absolute top-2 right-2 font-mono text-[10px] font-bold uppercase border-brutal border-ink px-2 py-1 bg-white hover:bg-ink hover:text-bone transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {activeTab === "type" && (
            <div className="w-full h-full flex flex-col">
              <input
                type="text"
                placeholder="ENTER FULL NAME"
                className="w-full p-4 border-brutal border-ink text-center text-3xl font-mono uppercase bg-white focus:outline-none focus:ring-0 focus:border-signal focus:shadow-brutal-active transition-all mb-4"
                onChange={(e) => setTypedName(e.target.value)}
                value={typedName}
              />
              <div className="flex gap-4 font-mono text-xs font-bold uppercase mb-4">
                {[
                  { id: "serif", label: "Serif" },
                  { id: "cursive", label: "Script" },
                  { id: "monospace", label: "Mono" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFont(f.id)}
                    className={`p-3 flex-1 border-brutal border-ink transition-colors ${font === f.id ? "bg-ink text-bone" : "bg-white text-ink hover:bg-ink/10"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 border-brutal border-ink bg-white flex items-center justify-center overflow-hidden">
                <div
                  className={`text-5xl text-ink ${font === "serif" ? "font-serif" : font === "monospace" ? "font-mono" : ""}`}
                  style={font === "cursive" ? { fontFamily: "cursive" } : {}}
                >
                  {typedName || "PREVIEW"}
                </div>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="border-brutal border-ink bg-white w-full h-full flex flex-col items-center justify-center relative hover:bg-ink/5 transition-colors group cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="h-40 mx-auto object-contain pointer-events-none"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <Upload
                    size={32}
                    className="text-ink group-hover:text-signal transition-colors"
                    strokeWidth={1.5}
                  />
                  <div>
                    <span className="font-mono text-sm font-bold uppercase block mb-1">
                      Select Image Payload
                    </span>
                    <p className="text-[10px] font-mono font-bold text-ink/50 uppercase tracking-widest">
                      JPG, PNG, WebP (Max 2MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ACTION DOCK */}
        <div className="p-6 border-t-brutal border-ink bg-white flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 font-mono text-sm font-bold uppercase border-brutal border-ink bg-white text-ink hover:bg-ink hover:text-bone transition-colors shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0 active:translate-x-0 active:shadow-none flex items-center gap-2"
          >
            <Trash2 size={16} strokeWidth={2.5} /> Void
          </button>

          <button
            onClick={handleFinish}
            className="flex-1 bg-signal text-white font-mono text-sm font-bold py-3 uppercase tracking-widest border-brutal border-ink shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0 active:translate-x-0 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} strokeWidth={3} /> Commit Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
