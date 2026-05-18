import Papa from "papaparse";

/**
 * Infers the SQL data type for a given value.
 * @param {string} value The string value from the CSV
 * @returns {string} The inferred SQL data type (INTEGER, BOOLEAN, DATE, or VARCHAR)
 */
function inferSqlType(value) {
    if (value === null || value === undefined || value.trim() === "") {
        return "VARCHAR"; // Default fallback
    }
    
    // Check for boolean
    const lowerVal = value.toLowerCase().trim();
    if (lowerVal === "true" || lowerVal === "false") {
        return "BOOLEAN";
    }

    // Check for Integer (simple check)
    if (!isNaN(Number(value)) && Number.isInteger(Number(value))) {
        return "INTEGER";
    }

    // Check for Float/Double
    if (!isNaN(Number(value)) && !Number.isInteger(Number(value))) {
        return "REAL"; // SQLite standard for floats
    }

    // Very basic ISO date check (could be expanded)
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|([+-]\d{2}:\d{2})))?$/;
    if (dateRegex.test(value)) {
         // Although technically SQLite stores dates as TEXT, REAL, or INTEGER, 
         // declaring it as DATE is syntactically fine and good for PostgreSQL dual mode.
        return "DATE";
    }

    return "VARCHAR";
}

/**
 * Parses a CSV file and generates a raw CREATE TABLE and INSERT SQL string.
 *
 * @param {File} file The CSV File object obtained from a file input or dropzone.
 * @param {string} tableName The desired name for the created SQL table.
 * @returns {Promise<string>} A Promise that resolves to the raw SQL string.
 */
export function processCsvToSql(file, tableName) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,      // Parse first row as column headers
            skipEmptyLines: true,
            complete: function(results) {
                const data = results.data;
                if (!data || data.length === 0) {
                     return reject(new Error("Empty CSV file"));
                }
                
                const columns = Object.keys(data[0]);
                
                // 1. Infer data types from the first data row
                const columnDefinitions = columns.map(col => {
                    const sampleValue = data[0][col];
                    const sqlType = inferSqlType(sampleValue);
                    
                    // Sanitize column names: remove spaces/special chars or quote them. 
                    // To be safe for both Postgres/SQLite, we'll double quote them.
                    return `"${col}" ${sqlType}`;
                });

                // 2. Generate CREATE TABLE query
                // We'll add IF NOT EXISTS in case they upload the same thing twice.
                const createTableSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n    ${columnDefinitions.join(",\n    ")}\n);\n`;

                // 3. Generate INSERT statements in batches
                // SQLite is extremely slow if we do 100k individual inserts outside a transaction.
                // We will wrap them in a transaction and use multi-value inserts.
                const batchSize = 500;
                const insertStatements = [];
                
                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize);
                    
                    const valuesStrings = batch.map(row => {
                        const values = columns.map(col => {
                            let val = row[col];
                            
                            if (val === null || val === undefined) return "NULL";
                            
                            val = String(val).trim();
                            if (val === "") return "NULL";

                            const type = inferSqlType(data[0][col]);
                            
                            if (type === "INTEGER" || type === "REAL" || type === "BOOLEAN") {
                                 if (type === "BOOLEAN") {
                                     return val.toLowerCase() === "true" ? "1" : "0";
                                 }
                                 // If it was inferred as number but this specific row has text (e.g. "Calib."), quote it!
                                 if (isNaN(Number(val))) {
                                     const escapedStr = val.replace(/'/g, "''");
                                     return `'${escapedStr}'`;
                                 }
                                 return val; // unquoted number
                            } else {
                                const escapedStr = val.replace(/'/g, "''");
                                return `'${escapedStr}'`;
                            }
                        });
                        return `(${values.join(", ")})`;
                    });
                    
                    insertStatements.push(`INSERT INTO "${tableName}" ("${columns.join('", "')}") VALUES ${valuesStrings.join(", ")};`);
                }

                // Combine them all together
                const finalSqlString = `${createTableSql}\nBEGIN TRANSACTION;\n${insertStatements.join("\n")}\nCOMMIT;`;
                
                resolve(finalSqlString);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}
