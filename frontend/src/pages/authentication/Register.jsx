import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

const InputField = ({ label, placeholder, type = "text", width = "w-[48%]", onChange, value }) => (
  <div className={`flex flex-col ${width} p-4`}>
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

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white inline-block ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// Owner toggle card
const OwnerToggle = ({ selected, onClick }) => (
  <div
    onClick={() => onClick(selected ? 'staff' : 'owner')}
    className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-4 transition-all select-none
      ${selected
        ? 'border-indigo-600 bg-indigo-50 shadow-md'
        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
      }`}
  >
    <div className="text-2xl">🏪</div>
    <div className="flex-1">
      <p className="font-bold text-gray-900 text-sm">Register as Owner</p>
      <p className="text-xs text-gray-500">Create & manage multiple shops, assign managers and staff</p>
    </div>
    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
      ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}
    >
      {selected && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  </div>
);

const Register = () => {
  const [username,   setUsername]   = useState("");
  const [first_name, setFirstname]  = useState("");
  const [last_name,  setLastname]   = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [role,       setRole]       = useState("staff");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await api.post("register/", { username, first_name, last_name, email, password, role });
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data)
        : "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex justify-center items-center min-h-screen bg-[#F4F7FA] p-10">
      <div className="bg-white shadow-2xl rounded-2xl px-10 py-12 w-full max-w-[900px]">
        {/* Header */}
        <section className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Account</h1>
          <p className="text-gray-600 text-lg">Join us today and start your journey. It only takes a minute!</p>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-md py-2 px-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          {/* Row 1: Names */}
          <div className="flex flex-wrap justify-between w-full max-w-[800px]">
            <InputField label="First Name" placeholder="John"    onChange={setFirstname} value={first_name} />
            <InputField label="Last Name"  placeholder="Doe"     onChange={setLastname}  value={last_name}  />
          </div>

          {/* Row 2: Username + Email */}
          <div className="flex flex-wrap justify-between w-full max-w-[800px]">
            <InputField label="Username" placeholder="johndoe123"      onChange={setUsername} value={username} />
            <InputField label="Email"    placeholder="john@example.com" onChange={setEmail}    value={email}    type="email" />
          </div>

          {/* Row 3: Password */}
          <div className="flex flex-wrap justify-center w-full max-w-[800px]">
            <InputField
              label="Password" placeholder="Enter your password"
              onChange={setPassword} value={password}
              type="password" width="w-[96%]"
            />
          </div>

          {/* Owner Toggle */}
          <div className="w-full max-w-[800px] px-4 mt-2">
            <OwnerToggle selected={role === 'owner'} onClick={setRole} />
            {role !== 'owner' && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Not an owner? You'll be invited to a shop by an owner.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={loading}
              className={`text-lg font-semibold tracking-tight text-white rounded-lg px-16 py-3 transition-colors flex items-center justify-center
                ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? <>Registering... <Spinner /></> : "Register"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center mt-8 text-gray-600 text-sm">
          Already have an account?{" "}
          <span
            className="text-indigo-600 font-semibold cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;