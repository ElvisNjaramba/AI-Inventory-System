import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

// ✅ Reusable InputField Component (same as before)
const InputField = ({ label, placeholder, type = "text", width = "w-[48%]", onChange, value }) => {
  return (
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
};

// ✅ Simple loading spinner icon
const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white inline-block ml-2"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    ></path>
  </svg>
);

const Register = () => {
  const [username, setUsername] = useState("");
  const [first_name, setFirstname] = useState("");
  const [last_name, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ✅ loading state
  const navigate = useNavigate();

  // ✅ Registration logic unchanged
  const handleSubmit = async (e) => {
    e.preventDefault();
    const userData = { username, first_name, last_name, email, password };

    try {
      setLoading(true); // show spinner
      const response = await api.post("/register/", userData);
      console.log("Registered!", response.data);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    } finally {
      setLoading(false); // hide spinner
    }
  };

  return (
    <div className="container mx-auto flex justify-center items-center min-h-screen bg-[#F4F7FA] p-10">
      <div className="bg-white shadow-2xl rounded-2xl px-10 py-12 w-full max-w-[900px]">
        {/* Header Section */}
        <section className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Account</h1>
          <p className="text-gray-600 text-lg">
            Join us today and start your journey. It only takes a minute!
          </p>
        </section>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          {/* Row 1: First + Last Name */}
          <div className="flex flex-wrap justify-between w-full max-w-[800px]">
            <InputField
              label="First Name"
              placeholder="John"
              onChange={setFirstname}
              value={first_name}
            />
            <InputField
              label="Last Name"
              placeholder="Doe"
              onChange={setLastname}
              value={last_name}
            />
          </div>

          {/* Row 2: Username + Email */}
          <div className="flex flex-wrap justify-between w-full max-w-[800px]">
            <InputField
              label="Username"
              placeholder="johndoe123"
              onChange={setUsername}
              value={username}
            />
            <InputField
              label="Email"
              placeholder="john@example.com"
              onChange={setEmail}
              value={email}
              type="email"
            />
          </div>

          {/* Row 3: Password */}
          <div className="flex flex-wrap justify-center w-full max-w-[800px]">
            <InputField
              label="Password"
              placeholder="Enter your password"
              onChange={setPassword}
              value={password}
              type="password"
              width="w-[96%]"
            />
          </div>

          {/* Submit Button with Spinner */}
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
              {loading ? (
                <>
                  Registering...
                  <Spinner />
                </>
              ) : (
                "Register"
              )}
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
