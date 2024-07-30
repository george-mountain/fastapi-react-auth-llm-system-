import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Button, Alert, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/ext-error_marker";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/snippets/python";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { request } from "../../../services/api";
import toastHandler from "../../helpers/Toasthandler";
import { FaMoon, FaSun } from "react-icons/fa";

const FORBIDDEN_KEYWORDS = [
  "open",
  "os.",
  "os.system",
  "os.remove",
  "os.rmdir",
  "os.mkdir",
  "os.makedirs",
  "os.rename",
  "os.replace",
  "os.unlink",
  "subprocess",
  "shutil",
];

const CodeEditor = () => {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("monokai");
  const outputRef = useRef(null);

  useEffect(() => {
    // Load autocompletion for Python mode
    ace.config.loadModule("ace/ext/language_tools", () => {
      ace.require("ace/ext/language_tools");
    });
  }, []);

  const containsForbiddenKeyword = (code) => {
    for (let keyword of FORBIDDEN_KEYWORDS) {
      if (code.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  };

  const executeCode = async () => {
    const forbiddenKeyword = containsForbiddenKeyword(code);
    if (forbiddenKeyword) {
      setError(`Forbidden operation detected: ${forbiddenKeyword}`);
      toastHandler(
        `Forbidden operation detected: ${forbiddenKeyword}`,
        "error"
      );
      setOutput("");
      return;
    }

    try {
      const response = await request.execute_code({ code });
      setOutput(response.data.result || response.data.error);
      setError("");
    } catch (error) {
      setOutput(error.message);
      console.log("Error message: ", error.message);
      setError("");
    }
  };

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output]);

  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => setCopiedCode(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);

  useEffect(() => {
    if (copiedOutput) {
      const timer = setTimeout(() => setCopiedOutput(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedOutput]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "monokai" ? "github" : "monokai"));
  };

  return (
    <Container>
      <Row className="my-3">
        <Col>
          <h2>Python Editor</h2>
        </Col>
      </Row>
      <Row className="my-3">
        <Col>
          <Card className="shadow-lg p-3 mb-5 bg-white rounded">
            <Card.Body>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h5>Code Editor</h5>
                <div>
                  {code && (
                    <CopyToClipboard
                      text={code}
                      onCopy={() => setCopiedCode(true)}
                    >
                      <Button variant="outline-secondary" size="sm">
                        {copiedCode ? "Copied!" : "Copy Code"}
                      </Button>
                    </CopyToClipboard>
                  )}
                  <Button variant="outline-secondary" size="sm" onClick={toggleTheme} style={{ marginLeft: "10px" }}>
                    {theme === "monokai" ? <FaSun /> : <FaMoon />}
                  </Button>
                </div>
              </div>
              <AceEditor
                mode="python"
                theme={theme}
                value={code}
                onChange={(newCode) => setCode(newCode)}
                name="code_editor"
                editorProps={{ $blockScrolling: true }}
                width="100%"
                height="400px"
                fontSize={18}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                }}
                style={{ borderRadius: "5px" }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="my-3">
        <Col>
          <Button variant="primary" onClick={executeCode}>
            Run Code
          </Button>
        </Col>
      </Row>
      {error && (
        <Row className="my-3">
          <Col>
            <Alert variant="danger">
              <pre>{error}</pre>
            </Alert>
          </Col>
        </Row>
      )}
      {output && (
        <Row className="my-3">
          <Col ref={outputRef}>
            <h3>Output:</h3>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h5>Execution Output</h5>
              <CopyToClipboard
                text={output}
                onCopy={() => setCopiedOutput(true)}
              >
                <Button variant="outline-secondary" size="sm">
                  {copiedOutput ? "Copied!" : "Copy Output"}
                </Button>
              </CopyToClipboard>
            </div>
            <Alert variant="secondary">
              <pre>{output}</pre>
            </Alert>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default CodeEditor;
