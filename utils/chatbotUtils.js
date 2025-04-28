export function replaceTokens(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, token) => data[token] || `{${token}}`);
}

// Example usage
const template = 'Welcome to {businessName}! Contact us at {email}.';
const data = { businessName: 'Power Wash Pros', email: 'info@powerwashpros.com' };
console.log(replaceTokens(template, data)); // Output: "Welcome to Power Wash Pros! Contact us at info@powerwashpros.com."
