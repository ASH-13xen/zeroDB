import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useCollab } from "../context/CollabContext";

const SqlEditor = ({ value, onChange, onSelectionChange }) => {
  const {
    activeRoomId,
    remoteCursors,
    broadcastTextChange,
    broadcastCursorMove,
  } = useCollab();

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to cursor selections
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getModel().getValueInRange(e.selection);
      if (onSelectionChange) {
        onSelectionChange(selection);
      }
    });

    // Listen to local cursor movement to broadcast
    editor.onDidChangeCursorPosition((e) => {
      if (activeRoomId) {
        broadcastCursorMove({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  const handleEditorChange = (val) => {
    onChange(val);
    if (activeRoomId) {
      broadcastTextChange(val);
    }
  };

  // Draw remote collaborator cursors
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeRoomId) {
      // Clear cursors if session is inactive
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const newDecorations = [];

    remoteCursors.forEach((peerData, peerId) => {
      const { cursor, user: peer } = peerData;
      if (!cursor) return;

      const { lineNumber, column } = cursor;
      const model = editor.getModel();
      if (!model || lineNumber > model.getLineCount()) return;

      // Pick a deterministic styling color based on peer's user ID
      const colors = ["indigo", "emerald", "amber", "rose", "fuchsia", "sky"];
      const peerColorIndex = Math.abs(peer._id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
      const color = colors[peerColorIndex];

      // Draw carets and small floating nametags in Monaco
      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `collab-cursor-${color}`,
          hoverMessage: { value: `**${peer.name}** is typing` },
          before: {
            content: "",
            inlineClassName: `collab-cursor-caret-${color}`,
          },
          after: {
            content: `\u00a0${peer.name}\u00a0`,
            inlineClassName: `collab-cursor-label-${color}`,
          }
        }
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors, activeRoomId]);

  return (
    <div className="w-full h-full border border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language="sql"
        theme="vs-dark"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
};

export default SqlEditor;
