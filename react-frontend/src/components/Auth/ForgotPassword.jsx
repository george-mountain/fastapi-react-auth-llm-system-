import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../../../services/api";
import toastHandler from "../../helpers/Toasthandler";
import "../../styles.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const frontendUrl = window.location.origin;

    request
      .requestPasswordReset({ email: email, frontendUrl: frontendUrl })
      .then((res) => {
        setLoading(false);
        toastHandler("Password reset email sent. Please check your inbox.", "success");
        navigate("/login");
      })
      .catch((err) => {
        setLoading(false);
        toastHandler("Failed to send password reset email. Please try again.", "error");
      });
  };

  return (
    <div className="forgot-password-container container mt-5">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit} className="forgot-password-form">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
