import React, { useState, useEffect } from "react";
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

import { request } from "../../../services/api";

const CodeEditor = () => {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    // Load autocompletion for Python mode
    ace.config.loadModule("ace/ext/language_tools", () => {
      ace.require("ace/ext/language_tools");
    });
  }, []);

  const executeCode = async () => {
    try {
      const response = await request.execute_code({ code });
      setOutput(response.data.result || response.data.error);
    } catch (error) {
      setOutput(error.message);
    }
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
              <AceEditor
                mode="python"
                theme="monokai"
                value={code}
                onChange={(newCode) => setCode(newCode)}
                name="code_editor"
                editorProps={{ $blockScrolling: true }}
                width="100%"
                height="450px"
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
      {output && (
        <Row className="my-3">
          <Col>
            <h3>Output:</h3>
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
