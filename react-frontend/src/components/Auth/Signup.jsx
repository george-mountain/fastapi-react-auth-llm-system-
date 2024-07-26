
import React, { useState } from 'react';
import { Form, Button, Container, Alert, Spinner } from 'react-bootstrap';
import { request } from '../../../services/api';
import toastHandler from '../../helpers/Toasthandler';
import '../../styles.css'; 

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);  

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); 
    try {
      await request.signup({ username, email, password });
      toastHandler('Signup successful! Please check your email for the activation link.', 'success');
    } catch (err) {
      setError('Signup failed. Please try again.');
      toastHandler('Signup failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="signup-container mt-4">
      <h2 className="text-center mb-4">Signup</h2>
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          <span>{error}</span>
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          <span>{success}</span>
        </Alert>
      )}
      <Form onSubmit={handleSignup} className="signup-form">
        <Form.Group controlId="username">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Button variant="primary" type="submit" className="mt-3" disabled={loading}>
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Signing up...
            </>
          ) : (
            'Signup'
          )}
        </Button>
      </Form>
    </Container>
  );
};

export default Signup;
