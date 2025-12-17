const { Matrix } = require('ml-matrix');

console.log("🤝 Testing Recommendation Engine...");

// Skills: [React, Node, Python, SQL]
const userSkills = new Matrix([[1, 1, 0, 0]]); // Knows React & Node
const courseMatrix = new Matrix([
    [1, 1, 1, 0], // Course A: React+Node+Python
    [0, 0, 1, 1], // Course B: Python+SQL
    [1, 0, 0, 1]  // Course C: React+SQL
]);

console.log("✅ Matrix dimensions:", courseMatrix.rows, "x", courseMatrix.columns);
console.log("✅ ml-matrix loaded successfully!");