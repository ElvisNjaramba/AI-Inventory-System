import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white inline-block ml-2"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const InputField = ({ label, placeholder, type = "text", value, onChange }) => (
  <div className="flex flex-col w-full p-4">
    <label className="font-bold mb-1">{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
      required
    />
  </div>
);

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post("token/", { username, password });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      navigate("/dashboard"); // ← change to your home route
    } catch (err) {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex justify-center items-center min-h-screen bg-[#F4F7FA] p-10">
      <div className="bg-white shadow-2xl rounded-2xl px-10 py-12 w-full max-w-[500px]">
        {/* Header */}
        <section className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome Back</h1>
          <p className="text-gray-600 text-lg">Sign in to continue to your account.</p>
        </section>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-md py-2 px-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div className="w-full">
            <InputField
              label="Username"
              placeholder="johndoe123"
              value={username}
              onChange={setUsername}
            />
            <InputField
              label="Password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={setPassword}
            />
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={loading}
              className={`text-lg font-semibold tracking-tight text-white rounded-lg px-16 py-3 transition-colors flex items-center justify-center ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? <>Signing in... <Spinner /></> : "Login"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center mt-8 text-gray-600 text-sm">
          Don't have an account?{" "}
          <span
            className="text-indigo-600 font-semibold cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;