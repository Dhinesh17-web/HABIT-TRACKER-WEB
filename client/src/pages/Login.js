import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await API.post("/auth/login", form);
      navigate("/dashboard");
    } catch (err) {
      const message = err?.response?.data?.msg || err?.response?.data || "Login failed";
      setError(message);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <span className="brand-name">Habit Harbor</span>
        </div>
        <Link className="ghost-btn" to="/register">
          Create account
        </Link>
      </header>

      <main className="page auth-layout">
        <section className="panel">
          <h1>Welcome back</h1>
          <p>Log in to review your habits, add new ones, and keep your streak steady.</p>

          <form className="form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-row">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Your secret"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button className="primary-btn" type="submit">
              Log in
            </button>
          </form>

          {error && <p className="habit-sub">{error}</p>}

          <p>
            New here? <Link className="muted-link" to="/register">Create an account</Link>
          </p>
        </section>

        <aside className="hero-card">
          <h2>Build habits you can see.</h2>
          <p>Track momentum with a simple view of what is active, completed, and ready for today.</p>
          <ul className="hero-list">
            <li>Plan with categories and quick filters.</li>
            <li>Stay focused with daily completion markers.</li>
            <li>Review progress without extra noise.</li>
          </ul>
        </aside>
      </main>

      <footer className="footer">Consistency beats intensity.</footer>
    </div>
  );
}

export default Login;
