const fs = require('fs');
const path = require('path');

// Get Vapi Private Key from command line arguments or environment
const privateKey = process.argv[2] || process.env.VAPI_PRIVATE_KEY;

if (!privateKey) {
  console.error('\x1b[31mError: Vapi Private Key is required.\x1b[0m');
  console.log('\nUsage:');
  console.log('  node import-workflow.js <YOUR_VAPI_PRIVATE_KEY>\n');
  console.log('You can find your Private Key on your Vapi Dashboard -> API Keys page (under "Private API Keys").\n');
  process.exit(1);
}

const filePath = path.join(__dirname, 'prepai-.json');

if (!fs.existsSync(filePath)) {
  console.error(`\x1b[31mError: prepai-.json not found in ${__dirname}\x1b[0m`);
  process.exit(1);
}

console.log('Reading prepai-.json...');
const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Uploading workflow to Vapi...');
fetch('https://api.vapi.ai/workflow', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${privateKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(workflowData)
})
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }
    return data;
  })
  .then((data) => {
    console.log('\n\x1b[32m✔ Workflow uploaded successfully!\x1b[0m');
    console.log('--------------------------------------------------');
    console.log(`Workflow Name: ${data.name}`);
    console.log(`Workflow ID:   \x1b[36m${data.id}\x1b[0m`);
    console.log('--------------------------------------------------\n');
    console.log('Please copy this Workflow ID and paste it in your .env file as:');
    console.log(`NEXT_PUBLIC_VAPI_WORKFLOW_ID=${data.id}\n`);
  })
  .catch((error) => {
    console.error('\x1b[31mError uploading workflow:\x1b[0m', error.message);
  });
