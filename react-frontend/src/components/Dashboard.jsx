import React, { useEffect, useState } from "react";
import { request } from "../../services/api";
import AddItem from "./AddItem";
import "../styles.css";
import { Container, Table, Button } from "react-bootstrap";
import toastHandler from "../helpers/Toasthandler";

const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchItems = () => {
      request
        .getUserItems()
        .then((response) => {
          setItems(response.data);
        })
        .catch((error) => {
          console.error(
            "Fetch items error:",
            error.response?.data || error.message
          );
          toastHandler("Failed to fetch items.", "error");
          setError("Failed to fetch items.");
        });
    };

    fetchItems();
  }, []);

  const handleNewItem = (item) => {
    setItems((prevItems) => [...prevItems, item]);
  };

  const handleDelete = (itemId) => {
    request
      .deleteUserItem(itemId)
      .then(() => {
        toastHandler(`Item ${itemId} deleted successfully.`, "success");
        setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
      })
      .catch((error) => {
        console.error(
          "Delete item error:",
          error.response?.data || error.message
        );
        toastHandler("Failed to delete item.", "error");
        setError("Failed to delete item.");
      });
  };

  return (
    <Container className="dashboard-container">
      <h2 className="mb-4">Dashboard</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {items.length > 0 ? (
        <Table striped bordered hover className="user-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.title}</td>
                <td>{item.description}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="alert alert-info">
          No items found. Please add a new item.
        </div>
      )}
      <AddItem onNewItem={handleNewItem} />
    </Container>
  );
};

export default Dashboard;
