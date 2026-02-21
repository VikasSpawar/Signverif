import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/login", formData);
      auth?.login(data);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-bone text-ink p-4 selection:bg-signal selection:text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 border-brutal border-ink shadow-brutal w-full max-w-md"
      >
        {/* HEADER */}
        <div className="mb-8 border-b-brutal border-ink pb-6">
          <h2 className="text-4xl font-serif font-extrabold uppercase tracking-tight leading-none mb-2">
            Portal Login
          </h2>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
            Secure Authentication
          </p>
        </div>

        {/* ERROR BLOCK */}
        {error && (
          <div className="bg-ink text-signal p-3 mb-6 border-brutal border-signal font-mono text-xs font-bold uppercase shadow-brutal-active">
            ERROR: {error}
          </div>
        )}

        {/* INPUTS */}
        <div className="space-y-6">
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-2">
              Email Identity
            </label>
            <input
              className="w-full p-4 border-brutal border-ink font-mono text-sm focus:outline-none focus:ring-0 focus:border-signal focus:shadow-brutal-active transition-all placeholder:text-ink/30"
              type="email"
              placeholder="USER@SYSTEM.COM"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-2">
              Passphrase
            </label>
            <input
              className="w-full p-4 border-brutal border-ink font-mono text-sm focus:outline-none focus:ring-0 focus:border-signal focus:shadow-brutal-active transition-all placeholder:text-ink/30"
              type="password"
              placeholder="••••••••"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>
        </div>

        {/* ACTION BUTTON */}
        <button
          type="submit"
          className="w-full mt-8 bg-ink text-bone font-mono font-bold text-sm py-4 border-brutal border-ink uppercase tracking-widest shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal-hover hover:bg-signal hover:text-white active:translate-y-0 active:translate-x-0 active:shadow-none transition-all"
        >
          Initialize Session
        </button>

        {/* FOOTER LINK */}
        <p className="mt-8 text-center font-mono text-[10px] font-bold uppercase text-ink/60 tracking-widest">
          No authorization?{" "}
          <Link
            to="/register"
            className="text-ink hover:text-signal underline underline-offset-4 transition-colors"
          >
            Request Access
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
