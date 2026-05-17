import Editor from "@monaco-editor/react";

const SqlEditor = ({ value, onChange, onSelectionChange }) => {
  const handleEditorDidMount = (editor, monaco) => {
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getModel().getValueInRange(e.selection);
      if (onSelectionChange) {
        onSelectionChange(selection);
      }
    });
  };

  return (
    <div className="w-full h-full border border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language="sql"
        theme="vs-dark"
        value={value}
        onChange={onChange}
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
