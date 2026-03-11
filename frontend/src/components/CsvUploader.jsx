import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { processCsvToSql } from "../utils/csvParser";

export default function CsvUploader({ onExecuteSql }) {
    const [status, setStatus] = useState("idle"); // idle, processing, success, error
    const [fileName, setFileName] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setFileName(file.name);
        setStatus("processing");
        setErrorMessage("");

        try {
            // Ensure table name is safe (no .csv extension, only alphanumerics optionally)
            const tableName = file.name.replace(/\.csv$/i, "").replace(/[^a-zA-Z0-9_]/g, "_");

            const generatedSqlString = await processCsvToSql(file, tableName);
            
            // Pass the raw SQL string back out to whatever function the Workspace gives us
            if (onExecuteSql) {
                await onExecuteSql(generatedSqlString);
            }

            setStatus("success");

            // Reset after a few seconds so they can upload another
            setTimeout(() => {
                setStatus("idle");
                setFileName("");
            }, 3000);

        } catch (error) {
            console.error(error);
            setErrorMessage(error.message || "Failed to process CSV file.");
            setStatus("error");
        }
    }, [onExecuteSql]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"]
        },
        maxFiles: 1
    });

    return (
        <div className="p-4 border border-zinc-700/50 bg-zinc-900 rounded-xl mb-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 ml-1 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                CSV to Table
            </h3>
            
            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-all duration-200 ease-in-out
                    ${isDragActive ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"}
                `}
            >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center justify-center space-y-3">
                    {status === "idle" && (
                        <>
                            <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                            <div className="text-sm text-zinc-300">
                                {isDragActive ? (
                                    <p className="font-medium text-emerald-400">Drop CSV file here...</p>
                                ) : (
                                    <p>
                                        <span className="font-semibold text-emerald-400">Click to upload</span> or drag and drop
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500">.csv files only</p>
                        </>
                    )}

                    {status === "processing" && (
                        <>
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            <p className="text-sm text-zinc-300">
                                Parsing <span className="font-medium text-emerald-400">{fileName}</span>...
                            </p>
                            <p className="text-xs text-zinc-500">Generating SQL Queries</p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            <p className="text-sm text-zinc-300">
                                <span className="font-medium text-emerald-400">{fileName}</span> imported!
                            </p>
                            <p className="text-xs text-zinc-500">Table created successfully</p>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="flex bg-rose-500/10 p-2 rounded-full mb-1">
                                <UploadCloud className="w-6 h-6 text-rose-500" />
                            </div>
                            <p className="text-sm text-rose-400">Error processing file</p>
                            <p className="text-xs text-zinc-500">{errorMessage}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
