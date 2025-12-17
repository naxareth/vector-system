const ss = require('simple-statistics');

console.log("📉 Testing Prediction Engine...");

// Mock job data: [month, job_count]
const jobHistory = [[1, 5000], [2, 4800], [3, 4500], [4, 4100], [5, 3800]];
const regression = ss.linearRegression(jobHistory);

console.log("✅ Slope (decay rate):", regression.m.toFixed(2));
console.log("✅ Current trend:", regression.m < -50 ? "HIGH DECAY ⚠️" : "Stable ✅");