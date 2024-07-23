import React, { useState } from "react";
import { request } from "../../services/api";
import toastHandler from "../helpers/Toasthandler";
import "../styles.css";

const AddItem = ({ onNewItem }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleAddItem = (e) => {
    e.preventDefault();
    request
      .createUserItem({ title, description })
      .then((response) => {
        console.log("Item added:", response.data);
        toastHandler("Item added successfully.", "success");
        onNewItem(response.data);
        setTitle("");
        setDescription("");
      })
      .catch((error) => {
        console.error("Add item error:", error.response?.data || error.message);
        toastHandler("Failed to add item.", "error");
        setError("Failed to add item.");
      });
  };

  return (
    <div className="add-item-container mt-4 container">
      {error && <div className="alert">{error}</div>}
      <form onSubmit={handleAddItem}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary mt-2">
          Add Item
        </button>
      </form>
    </div>
  );
};

export default AddItem;
