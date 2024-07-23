import React, { useState } from "react";
import { Container, Form, Button, ListGroup, Spinner } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { request } from "../../../services/api";
import toastHandler from "../../helpers/Toasthandler";
import "../../styles.css";
import { Link } from "react-router-dom";

const Chat = ({ userId }) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessages([...messages, { text: userInput, type: "user" }]);
    setUserInput("");
    setLoading(true);

    try {
      const response = await request.chat({ user_prompt: userInput });

      if (response.status === 429) {
        const timeLeft = response.data.time_left;
        setRateLimitMessage(`Rate limit exceeded. Try again after ${timeLeft}`);
        setLoading(false);
        return;
      }

      setMessages([
        ...messages,
        { text: userInput, type: "user" },
        { text: response.data.response, type: "bot" },
      ]);
      setRateLimitMessage(""); // Clear rate limit message if successful
    } catch (error) {
      if (error.response?.status === 429) {
        const timeLeft = error.response.data.time_left;
        setRateLimitMessage(`Rate limit exceeded. Try again after ${timeLeft}`);
      } else {
        console.error("Chat API error:", error.response?.data || error.message);
        toastHandler("Failed to get response from chat API.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toastHandler("Response copied to clipboard.", "success");
      })
      .catch((err) => {
        toastHandler("Failed to copy text.", "error");
      });
  };

  return (
    <Container className="chat-container">
      <h2 className="mb-4">Chat</h2>
      <ListGroup className="mb-3">
        {messages.map((msg, index) => (
          <ListGroup.Item
            key={index}
            className={msg.type === "user" ? "user-message" : "bot-message"}
            style={msg.type === "user" ? { backgroundColor: "#f0f0f0" } : {}}
          >
            {msg.type === "bot" ? (
              <>
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={materialDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleCopy(msg.text)}
                >
                  Copy
                </Button>
              </>
            ) : (
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={materialDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {msg.text}
              </ReactMarkdown>
            )}
          </ListGroup.Item>
        ))}
        {loading && (
          <ListGroup.Item className="text-center">
            <Spinner animation="border" size="sm" className="me-2" />
            Generation in progress...
          </ListGroup.Item>
        )}
      </ListGroup>
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="chatInput">
          <Form.Control
            as="textarea"
            rows={3}
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type your message..."
          />
        </Form.Group>
        <Button variant="primary" type="submit" className="mt-2">
          Send
        </Button>
      </Form>
      <Link to="/code-history">View Chat History</Link>
      {rateLimitMessage && (
        <p className="mt-3 text-danger">{rateLimitMessage}</p>
      )}
    </Container>
  );
};

export default Chat;
