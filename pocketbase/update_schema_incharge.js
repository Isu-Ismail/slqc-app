const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'pb_hooks', 'schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const instCollection = schema.find(c => c.name === 'institutions');
if (!instCollection) {
  console.error('Could not find institutions collection');
  process.exit(1);
}

// Check if fields already exist
const hasIncharge = instCollection.fields.some(f => f.name === 'incharge');
const hasInchargeNumber = instCollection.fields.some(f => f.name === 'incharge_number');

if (!hasIncharge) {
  instCollection.fields.push({
    "id": "text_incharge",
    "name": "incharge",
    "type": "text",
    "system": false,
    "required": false,
    "presentable": false,
    "min": 0,
    "max": 0,
    "pattern": "",
    "autogeneratePattern": ""
  });
  console.log('Added incharge field');
}

if (!hasInchargeNumber) {
  instCollection.fields.push({
    "id": "text_incharge_number",
    "name": "incharge_number",
    "type": "text",
    "system": false,
    "required": false,
    "presentable": false,
    "min": 0,
    "max": 0,
    "pattern": "",
    "autogeneratePattern": ""
  });
  console.log('Added incharge_number field');
}

fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf8');
console.log('Schema updated successfully');
