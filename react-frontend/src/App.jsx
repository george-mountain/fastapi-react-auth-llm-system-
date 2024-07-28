

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container } from 'react-bootstrap';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Profile from './components/Auth/Profile';
import Dashboard from './components/Dashboard';
import Chat from './components/models/Chat';
import ChatHistory from './components/models/ChatHistory'; 
import Cookies from 'universal-cookie';
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css'; 
import { request } from '../services/api';
import CodeEditor from './components/codeEditor/CodeEditor';

// Layout component
import Layout from './components/Layout';


const App = () => {
  const cookies = new Cookies();
  const [isLoggedIn, setIsLoggedIn] = useState(!!cookies.get('access'));
  const [user, setUser] = useState(null);
  const [user_id, setUserId] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      request.getInfo().then(response => {
        setUser(response.data.username);
        setUserId(response.data.id);
      }).catch(err => {
        console.error("Failed to fetch user info:", err);
        handleLogout();
      });
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    cookies.remove('access', { path: '/' });
    cookies.remove('refresh', { path: '/' });
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <Router>
      <Layout isLoggedIn={isLoggedIn} handleLogout={handleLogout} userName={user || 'Guest'}>
        <Container fluid className="content-container">
          <ToastContainer
            position="top-center"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            draggableDirection="y"
          />
          <Routes>
            {isLoggedIn ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/" />} />
                <Route path="/code" element={<Chat userId={user_id}/>} />
                <Route path="/code-history" element={<ChatHistory chatId={user_id} />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/code-editor" element={<CodeEditor />} />
              </>
            ) : (
              <>
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setUser={setUser} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            )}
          </Routes>
        </Container>
      </Layout>
    </Router>
  );
};

export default App;
