import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { request } from "../../../services/api";
import toastHandler from "../../helpers/Toasthandler";
import Cookies from "universal-cookie";
import "../../styles.css";

const Login = ({ setIsLoggedIn, setUser }) => {
  const cookies = new Cookies();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [data, setData] = useState({
    username: "",
    password: "",
  });

  const changeHandler = (e, name) => {
    setData({ ...data, [name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    request
      .login({
        username: data.username,
        password: data.password,
      })
      .then((res) => {
        setLoading(false);

        if (res.data.access_token) {
          cookies.set("access", res.data.access_token, { path: "/" });
          cookies.set("refresh", res.data.refresh_token, { path: "/" });

          request
            .getInfo()
            .then((response) => {
              const username = response.data.username;
              setUser(response.data.username);
              setIsLoggedIn(true);
              toastHandler(`welcome ${username}`, "success");
              navigate("/");
            })
            .catch((err) => {
              console.error("Failed to fetch user info:", err);
              toastHandler("Failed to fetch user info.", "error");
            });
        } else {
          toastHandler("Invalid credentials. Please try again.", "error");
        }
      })
      .catch((err) => {
        toastHandler("Invalid credentials. Please try again.", "error");
        setLoading(false);
      });
  };

  return (
    <div className="login-container container mt-5">
      <h2>Login</h2>
      <form onSubmit={handleLogin} className="login-form">
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            className="form-control"
            value={data.username}
            onChange={(e) => changeHandler(e, "username")}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={data.password}
            onChange={(e) => changeHandler(e, "password")}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary mt-2"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="forgot-password-link mt-2">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
    </div>
  );
};

export default Login;
