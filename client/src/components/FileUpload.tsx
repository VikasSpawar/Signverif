import { Upload } from "lucide-react";
import React, { useState } from "react";
import { uploadDocument } from "../services/api";

interface Props {
  onUploadSuccess: () => void;
}

const FileUpload = ({ onUploadSuccess }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      await uploadDocument(file);
      setFile(null);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        {/* The Drop Zone */}
        <div className="relative border-brutal border-ink bg-white p-6 transition-all hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal group">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isUploading}
          />
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <div
              className={`p-3 border-brutal border-ink transition-colors ${file ? "bg-ink text-white" : "bg-bone text-ink group-hover:bg-signal group-hover:text-white group-hover:border-signal"}`}
            >
              <Upload size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-mono text-sm font-bold uppercase tracking-wide">
                {file ? file.name : "SELECT PDF PAYLOAD"}
              </p>
              <p className="font-mono text-xs text-ink/60 mt-1 uppercase">
                {file ? "READY FOR DEPOSIT" : "Max size: 5MB"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-ink text-signal font-mono text-xs p-3 font-bold uppercase border-brutal border-ink">
            ERROR: {error}
          </div>
        )}

        {/* The Action Button */}
        <button
          type="submit"
          disabled={!file || isUploading}
          className={`w-full py-3 px-6 font-mono font-bold text-sm uppercase tracking-widest border-brutal transition-all flex justify-center items-center ${
            !file || isUploading
              ? "bg-bone text-ink/40 border-ink/40 cursor-not-allowed"
              : "bg-signal text-white border-ink shadow-brutal hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none"
          }`}
        >
          {isUploading ? "TRANSMITTING..." : "DEPOSIT DOCUMENT"}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;
