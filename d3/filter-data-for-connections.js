const csv = require('csvtojson')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

function loadData(file) {
  return csv().fromFile(file);
}

function writeData(data) {
  const header = Object.keys(data[0]).map(k => ({id: k, title: k}));
  const csvWriter = createCsvWriter({
    path: 'data/filtered_persons_projects.csv',
    header
  });

  csvWriter.writeRecords(data);
}

async function main() {
  const nodesData = await loadData('data/nodes.csv');
  const connectionData = await loadData('data/persons_projects.csv');

  const nodesPersonIds = nodesData.map(node => node.person_id);
  const newConnectionData = connectionData.filter(c => nodesPersonIds.includes(c.person_id));

  writeData(newConnectionData);
}

main()
