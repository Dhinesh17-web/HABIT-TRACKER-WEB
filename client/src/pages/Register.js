import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
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
      await API.post("/auth/register", form);
      alert("Registered Successfully!");
      navigate("/dashboard");
    } catch (err) {
      const message = err?.response?.data?.msg || err?.response?.data || "Registration failed";
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
        <Link className="ghost-btn" to="/">
          Back to login
        </Link>
      </header>

      <main className="page auth-layout">
        <section className="panel">
          <h1>Create your space</h1>
          <p>Set up your account and start building habits you can actually stick with.</p>

          <form className="form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="register-name">Name</label>
              <input
                id="register-name"
                type="text"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                name="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="register-password">Password</label>
              <div className="input-row">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
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
              Create account
            </button>
          </form>

          {error && <p className="habit-sub">{error}</p>}

          <p>
            Already signed up? <Link className="muted-link" to="/">Log in</Link>
          </p>
        </section>

        <aside className="hero-card">
          <h2>Make progress visible.</h2>
          <p>Give each habit a name, a category, and a clear daily win.</p>
          <ul className="hero-list">
            <li>Start with a few habits and grow steadily.</li>
            <li>Track completion with one tap.</li>
            <li>Review what is working every day.</li>
          </ul>
        </aside>
      </main>

      <footer className="footer">Small steps, steady gains.</footer>
    </div>
  );
}

export default Register;
