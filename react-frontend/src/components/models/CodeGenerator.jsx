import React, { useState, useRef, useEffect } from "react";
import { Container, Form, Button, ListGroup, Spinner } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import toastHandler from "../../helpers/Toasthandler";
import "../../styles.css";
import { Link } from "react-router-dom";
import Cookies from "universal-cookie";

const CodeGenerator = ({ userId }) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  const responseAreaRef = useRef(null);

  const cookies = new Cookies();

  useEffect(() => {
    if (responseAreaRef.current) {
      responseAreaRef.current.scrollTop = responseAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userMessage = { text: userInput, type: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setLoading(true);

    try {
      const token = cookies.get("access");
      const system_prompt = `
        You are a coding tutor and assistant and you need to help the user with coding and programming tasks.
        If the user did not ask any coding or programming questions, 
        tell the user that you can only provide assistance to coding questions. 
        
        `;

      const res = await fetch("http://127.0.0.1:8080/api/v1/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: userInput, system_prompt: system_prompt }),
      });

      if (res.status === 429) {
        const timeLeft = res.data.time_left;
        setRateLimitMessage(`Rate limit exceeded. Try again after ${timeLeft}`);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = { text: "", type: "bot" };

      setMessages((prev) => [...prev, botMessage]);

      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                setLoading(false);
                return;
              }
              const newText = decoder.decode(value, { stream: true });
              botMessage = { ...botMessage, text: botMessage.text + newText };
              setMessages((prev) =>
                prev.map((msg, idx) =>
                  idx === prev.length - 1 ? botMessage : msg
                )
              );
              controller.enqueue(value);

              // Ensure the view scrolls to the bottom when new content is added
              if (responseAreaRef.current) {
                responseAreaRef.current.scrollTop =
                  responseAreaRef.current.scrollHeight;
              }

              push();
            });
          }
          push();
        },
      });

      const responseStream = new Response(stream);
      await responseStream.text(); // This ensures that the stream is fully consumed
      setRateLimitMessage("");
    } catch (error) {
      if (error.response?.status === 429) {
        const timeLeft = error.response.data.time_left;
        setRateLimitMessage(`Rate limit exceeded. Try again after ${timeLeft}`);
      } else {
        console.error("Chat API error:", error.response?.data || error.message);
        toastHandler("Failed to get response from chat API.", "error");
      }
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
      <h2 className="mb-4">Code Generation</h2>
      <div
        ref={responseAreaRef}
        style={{ maxHeight: "60vh", overflowY: "auto" }}
      >
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
      </div>
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

export default CodeGenerator;
