/**
 * Parses SQLite's EXPLAIN QUERY PLAN output into React Flow nodes and edges.
 * Standard SQLite output columns: [id, parent, notused, detail]
 */
export const parseQueryPlan = (results) => {
  if (!results || !results.values) return { nodes: [], edges: [] };

  const nodes = [];
  const edges = [];
  
  // Calculate depths to create a horizontal hierarchy
  const depthMap = {};
  
  // First pass: identify root and map parents
  values.forEach(row => {
    const [id, parent] = row;
    if (parent === 0) {
      depthMap[id] = 0;
    }
  });

  // Iteratively calculate depths for children
  let changed = true;
  while (changed) {
    changed = false;
    values.forEach(row => {
      const [id, parent] = row;
      if (depthMap[parent] !== undefined && depthMap[id] === undefined) {
        depthMap[id] = depthMap[parent] + 1;
        changed = true;
      }
    });
  }
  
  values.forEach((row, index) => {
    const [id, parent, , detail] = row;
    const depth = depthMap[id] || 0;
    
    // Create node
    nodes.push({
      id: id.toString(),
      data: { label: detail },
      position: { x: depth * 300, y: index * 100 },
      style: { 
        background: '#18181b', 
        color: '#d4d4d8', 
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '11px',
        width: 250,
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }
    });

    // Create edge if parent exists
    if (parent !== 0) {
      edges.push({
        id: `e${parent}-${id}`,
        source: parent.toString(),
        target: id.toString(),
        animated: true,
        style: { stroke: '#60a5fa', strokeWidth: 2 }
      });
    }
  });

  return { nodes, edges };
};
