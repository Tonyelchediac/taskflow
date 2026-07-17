"use client";
import Images from "./images/logo.png";
import { useState } from "react";
import { useNavigate, Navigate } from 'react-router-dom';
import { setToken, getUser, authFetch, isAuthenticated } from './utils/auth';

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // If already authenticated, redirect to the appropriate dashboard
  if (isAuthenticated()) {
    const user = getUser();
    if (user) {
      if (user.status === "ur") {
        return <Navigate to="/user" replace />;
      } else if (user.status === "ad") {
        return <Navigate to="/admin" replace />;
      }
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("emailAddress");
    const password = form.get("password");

    try {
      const response = await fetch('https://taskflow-k90l.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usermail: email, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        // Store the JWT
        setToken(data.token);

        // Decode payload to get userID and status (no extra round-trip)
        const decoded = getUser();
        const userID = decoded.userID;
        const status = decoded.status;

        // Fetch the display name from the protected endpoint
        try {
          const userDetailsRes = await authFetch(`https://taskflow-k90l.onrender.com/users/${userID}`);
          if (userDetailsRes.ok) {
            const userDetails = await userDetailsRes.json();
            localStorage.setItem('username', userDetails.username || 'User');
          } else {
            localStorage.setItem('username', 'User');
          }
        } catch {
          localStorage.setItem('username', 'User');
        }

        if (status === "ur") {
          navigate('/user');
        } else if (status === "ad") {
          navigate('/admin');
        } else {
          setError("Unknown user status");
          setLoading(false);
        }
      } else {
        setError(data.error || "Invalid email or password");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row">
      {/* left section image */}
      <section
        className="md:block relative md:w-1/2 h-screen"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAUChz-kmbvo4cI2ERyRcE6dmqXrBDsVUB1t1eYVC735dC204XdvCk9KdPhO38NUzI5jgJvL_L5Rpz4qvb0JAIBw47I_XlHYz-Et-LgzS_oi4mAee6QdZLgNKn86_uMypHtBrdbZ4VO7qx--spYfo7vpHtEwIBbQYyaD7-ABiBm-MyTPGjiQsB4Da_8eB6yywzAh7D_Gi4ui1zfxNwrsffYuFhetaV9i60Dsw5ys3rsna6PzVhlf8E_RxWAU2qxYrnXi7RvPcNatK0')`,
        }}
      >
        <div className="absolute inset-0 bg-blue-600/80"></div>

        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="backdrop-blur-md bg-transparent shadow-2xl border-amber-50 border max-w-10/12 h-auto p-8 rounded-xl text-center">
            <p className="font-bold text-white text-4xl">
              Master Your Workflow
            </p>
            <p className="text-white w-full mt-5">
              Join thousands of teams streamlining their daily operations with
              TaskFlow.
            </p>
          </div>
        </div>
      </section>

      <section className="p-5 flex items-center justify-center w-full md:w-1/2 h-screen">
        <div className="lg:max-w-1/2 w-full">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-5 w-full">
              <img src={Images} alt="TaskFlow Logo" width={50} height={50} />
              <p className="text-4xl font-bold">TaskFlow</p>
            </div>
            <div className="mt-5 w-full">
              <p className="font-bold text-2xl">Welcome Back</p>
              <p>Please enter your credentials to access your dashboard</p>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="mt-5 w-full">
              <p className="text-sm font-semibold">Email Address</p>
              <input
                className="w-full mt-2 border p-3 rounded-lg bg-blue-100"
                type="email"
                name="emailAddress"
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="mt-5">
              <div className="flex justify-between">
                <p className="text-sm font-semibold">Password</p>
                <a href="" className="text-sm text-blue-600 font-semibold">
                  Forgot Password?
                </a>
              </div>

              <div className="relative mt-2">
                <input
                  className="w-full border p-3 pr-10 rounded-lg bg-blue-100"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer text-white mt-2 border p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Login;