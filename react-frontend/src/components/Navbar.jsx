
import React from 'react';
import { Navbar as BootstrapNavbar, Nav } from 'react-bootstrap';
import { Dropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../styles.css'; 

const Navbar = ({ isLoggedIn, handleLogout, userName }) => {
  const location = useLocation(); // Get the current route location

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg">
      <div className="container-fluid">
        <BootstrapNavbar.Brand as={Link} to="/">Authify</BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {
              isLoggedIn ? (
                <>
                  <Nav.Link as={Link} to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Nav.Link>
                  <Nav.Link as={Link} to="/chat" className={location.pathname === '/chat' ? 'active' : ''}>Chat</Nav.Link>
                  <Nav.Link as={Link} to="code" className={location.pathname === '/code' ? 'active' : ''}>Code Generation</Nav.Link>
                  <Nav.Link as={Link} to="/translation" className={location.pathname === '/page2' ? 'active' : ''}>Translation Service</Nav.Link>
                  <Nav.Link as={Link} to="code-editor" className={location.pathname === '/code-editor' ? 'active' : ''}>Code Editor</Nav.Link>
                </>
              ) : (
                <Nav.Link as={Link} to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Nav.Link>
              )
            }
          </Nav>
          <Nav className="navbar-right">
            {isLoggedIn ? (
              <Dropdown>
                <Dropdown.Toggle variant="dark" id="dropdown-basic">
                  {userName}
                </Dropdown.Toggle>

                <Dropdown.Menu align="end"> {/* Use align prop here */}
                  <Dropdown.Item as={Link} to="/profile">Profile</Dropdown.Item>
                  <Dropdown.Item as={Link} to="/settings">Settings</Dropdown.Item>
                  <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/signup" className={location.pathname === '/signup' ? 'active' : ''}>
                  <span className="bi bi-person"></span> Sign Up
                </Nav.Link>
                <Nav.Link as={Link} to="/login" className={location.pathname === '/login' ? 'active' : ''}>
                  <span className="bi bi-box-arrow-in-right"></span> Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </div>
    </BootstrapNavbar>
  );
};

export default Navbar;
