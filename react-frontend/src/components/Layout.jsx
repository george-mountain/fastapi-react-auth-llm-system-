import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children, isLoggedIn, handleLogout, userName }) => {
  return (
    <div className="main-container">
      <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} userName={userName} />
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
