import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { request } from "../../../services/api";
import toastHandler from "../../helpers/Toasthandler";
import "../../styles.css";

const ResetPassword = () => {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("token", token, "newPassword", newPassword);

    request
      .resetPassword({ token, new_password: newPassword })
      .then((res) => {
        setLoading(false);
        toastHandler("Password reset successful. Please login with your new password.", "success");
        navigate("/login");
      })
      .catch((err) => {
        setLoading(false);
        toastHandler("Failed to reset password. Please try again.", "error");
      });
  };

  return (
    <div className="reset-password-container container mt-5">
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit} className="reset-password-form">
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            className="form-control"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
