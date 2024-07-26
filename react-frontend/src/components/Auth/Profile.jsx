
import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Spinner, Table } from 'react-bootstrap';
import { request } from '../../../services/api';
import '../../styles.css';
import toastHandler from '../../helpers/Toasthandler';
import { FaPencilAlt, FaSave, FaTimes } from 'react-icons/fa';

const Profile = () => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editFullName, setEditFullName] = useState(false);
  const [editPhoneNumber, setEditPhoneNumber] = useState(false);
  const [initialFullName, setInitialFullName] = useState('');
  const [initialPhoneNumber, setInitialPhoneNumber] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await request.getInfo();
        setUserData(response.data);
        setFullName(response.data.full_name || '');
        setPhoneNumber(response.data.phone_number || '');
        setInitialFullName(response.data.full_name || '');
        setInitialPhoneNumber(response.data.phone_number || '');
      } catch (err) {
        toastHandler('Failed to load profile data.', 'error');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleFieldUpdate = async (field) => {
    setLoading(true);
    try {
      await request.updateProfile({ [field]: field === 'full_name' ? fullName : phoneNumber });
      toastHandler(`${field === 'full_name' ? 'Full name' : 'Phone number'} updated successfully!`, 'success');
      setUserData((prevData) => ({
        ...prevData,
        [field]: field === 'full_name' ? fullName : phoneNumber
      }));
    } catch (err) {
      toastHandler(`Failed to update ${field === 'full_name' ? 'full name' : 'phone number'}. Please try again.`, 'error');
    } finally {
      setLoading(false);
      if (field === 'full_name') {
        setEditFullName(false);
      } else {
        setEditPhoneNumber(false);
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await request.updateProfile({ full_name: fullName, phone_number: phoneNumber });
      toastHandler('Profile updated successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      toastHandler('Failed to update profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (field) => {
    if (field === 'full_name') {
      setFullName(initialFullName);
      setEditFullName(false);
    } else {
      setPhoneNumber(initialPhoneNumber);
      setEditPhoneNumber(false);
    }
  };

  return (
    <Container className="profile-container mt-4">
      <h2 className="text-center mb-4">Profile</h2>
      {initialLoading ? (
        <Spinner animation="border" role="status">
          <span className="sr-only">Loading...</span>
        </Spinner>
      ) : (
        <>
          <Table striped bordered hover className="mb-4">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                <th>Phone Number</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{userData.username}</td>
                <td>{userData.email}</td>
                <td>
                  {editFullName ? (
                    <>
                      <Form.Control
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleCancel('full_name')}
                        className="ms-2"
                      >
                        <FaTimes />
                      </Button>
                    </>
                  ) : (
                    userData.full_name
                  )}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      if (editFullName) {
                        handleFieldUpdate('full_name');
                      } else {
                        setEditFullName(true);
                      }
                    }}
                    className="ms-2"
                  >
                    {editFullName ? <FaSave /> : <FaPencilAlt />}
                  </Button>
                </td>
                <td>
                  {editPhoneNumber ? (
                    <>
                      <Form.Control
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleCancel('phone_number')}
                        className="ms-2"
                      >
                        <FaTimes />
                      </Button>
                    </>
                  ) : (
                    userData.phone_number
                  )}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      if (editPhoneNumber) {
                        handleFieldUpdate('phone_number');
                      } else {
                        setEditPhoneNumber(true);
                      }
                    }}
                    className="ms-2"
                  >
                    {editPhoneNumber ? <FaSave /> : <FaPencilAlt />}
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
          <Form onSubmit={handleProfileUpdate} className="profile-form">
            <Form.Group controlId="fullName">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="phoneNumber">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="mt-3" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          </Form>
        </>
      )}
    </Container>
  );
};

export default Profile;
