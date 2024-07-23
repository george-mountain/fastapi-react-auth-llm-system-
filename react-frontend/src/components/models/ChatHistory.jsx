import React, { useState, useEffect } from "react";
import {
  Container,
  ListGroup,
  Spinner,
  Button,
  Row,
  Col,
} from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { request } from "../../../services/api";
import toastHandler from "../../helpers/Toasthandler";
import "../../styles.css";

const ChatHistory = ({ chatId }) => {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalChats, setTotalChats] = useState(0); // To track total number of chats

  useEffect(() => {
    if (!chatId) {
      return;
    }

    const fetchChats = async () => {
      setLoading(true);
      try {
        const response = await request.getChats({
          user_id: chatId,
          page,
          pageSize,
        });
        console.log("User Id to Chat history:", chatId);
        setChats(response.data.chats);
        setTotalChats(response.data.total);
      } catch (error) {
        console.error(
          "Failed to fetch chats:",
          error.response?.data || error.message
        );
        toastHandler("Failed to fetch chats.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [chatId, page, pageSize]);

  const handleChatSelect = async (id) => {
    setLoading(true);
    setSelectedChatId(id);
    try {
      const response = await request.getChatMessages({
        chatId: id,
        page: 1,
        pageSize,
      }); // Reset to first page of messages
      setMessages(response.data.messages);
    } catch (error) {
      console.error(
        "Failed to fetch chat messages:",
        error.response?.data || error.message
      );
      toastHandler("Failed to fetch chat messages.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (id) => {
    setLoading(true);
    try {
      console.log("Deleting chat:", id);
      await request.deleteChat(id);
      setChats(chats.filter((chat) => chat.id !== id));
      toastHandler("Chat deleted successfully.", "success");
    } catch (error) {
      console.error(
        "Failed to delete chat:",
        error.response?.data || error.message
      );
      toastHandler("Failed to delete chat.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveAllChats = async () => {
    setLoading(true);
    try {
      console.log("Archiving all chats for user:", chatId);
      await request.archiveAllChats(chatId);
      setChats([]);
      setMessages([]);
      setSelectedChatId(null);
      toastHandler("All chats archived successfully.", "success");
    } catch (error) {
      console.error(
        "Failed to archive chats:",
        error.response?.data || error.message
      );
      toastHandler("Failed to archive chats.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (page * pageSize < totalChats) {
      // Check if more pages are available
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      // Check if not on the first page
      setPage((prevPage) => prevPage - 1);
    }
  };

  const hasPreviousPage = page > 1;
  const hasNextPage = page * pageSize < totalChats;

  // Determine if we have enough chats or messages to show the archive button
  const shouldShowArchiveButton = chats.length >= 2 || messages.length >= 2;
  const shouldShowPaginationButtons = chats.length > 0 || messages.length > 0;

  return (
    <Container className="chat-history-container">
      <h2 className="mb-4">Chat History</h2>
      {loading && <Spinner animation="border" size="sm" className="me-2" />}
      {shouldShowArchiveButton && (
        <Button
          variant="warning"
          onClick={handleArchiveAllChats}
          className="mb-3"
        >
          Archive All Chats
        </Button>
      )}
      <ListGroup className="mb-3">
        {chats.map((chat) => (
          <ListGroup.Item key={chat.id}>
            <Row>
              <Col
                onClick={() => handleChatSelect(chat.id)}
                className="clickable"
              >
                Chat ID: {chat.id}
              </Col>
              <Col className="text-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteChat(chat.id)}
                >
                  Delete
                </Button>
              </Col>
            </Row>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {shouldShowPaginationButtons && (
        <Row className="mb-3">
          <Col>
            <Button
              variant={hasPreviousPage ? "primary" : "secondary"}
              onClick={handlePrevPage}
              disabled={!hasPreviousPage}
            >
              Previous
            </Button>
          </Col>
          <Col className="text-end">
            <Button
              variant={hasNextPage ? "primary" : "secondary"}
              onClick={handleNextPage}
              disabled={!hasNextPage}
            >
              Next
            </Button>
          </Col>
        </Row>
      )}

      {selectedChatId && (
        <>
          <h4>Messages for Chat ID: {selectedChatId}</h4>
          <ListGroup className="mb-3">
            {messages.map((msg, index) => (
              <ListGroup.Item key={index}>
                <strong>{msg.sender}:</strong>
                {msg.sender === "bot" ? (
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
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span>{msg.content}</span>
                )}
                <div className="text-muted small">
                  {new Date(msg.created_at).toLocaleString()}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}
    </Container>
  );
};

export default ChatHistory;
