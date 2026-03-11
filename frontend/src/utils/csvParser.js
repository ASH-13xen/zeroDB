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

                // 3. Generate INSERT statements
                // If there are thousands of rows, single inserts are slow. 
                // We'll bundle them into multi-value inserts or a transaction of single inserts.
                // For simplicity and raw string passing to `executeSql`, we'll do single INSERTs.
                // SQLite supports multi-value inserts, but doing it in a batch might be safer.
                
                const insertStatements = data.map(row => {
                    // Extract values in the same order as columns
                    const values = columns.map(col => {
                        let val = row[col];
                        
                        // Handle nulls/empty
                        if (val === null || val === undefined) {
                            return "NULL";
                        }
                        
                        val = String(val).trim();
                        if (val === "") {
                             return "NULL";
                        }

                        // We need to type-check to know whether to wrap in single quotes
                        const type = inferSqlType(data[0][col]); // use same inferred type
                        
                        if (type === "INTEGER" || type === "REAL" || type === "BOOLEAN") {
                             // E.g. boolean TRUE goes as TRUE in SQL or 1.
                             if (type === "BOOLEAN") {
                                 return val.toLowerCase() === "true" ? "1" : "0"; // SQLite prefers 1/0 for bools
                             }
                             return val; // unquoted
                        } else {
                            // Escape single quotes by doubling them for SQL strings
                            const escapedStr = val.replace(/'/g, "''");
                            return `'${escapedStr}'`;
                        }
                    });

                    return `INSERT INTO "${tableName}" ("${columns.join('", "')}") VALUES (${values.join(", ")});`;
                });

                // Combine them all together
                const finalSqlString = `${createTableSql}\n${insertStatements.join("\n")}`;
                
                resolve(finalSqlString);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}
