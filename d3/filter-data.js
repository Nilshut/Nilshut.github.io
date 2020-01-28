const csv = require('csvtojson')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

function loadData() {
  return csv().fromFile('links.csv');
}

function filterData(data) {
  return data.reduce((filtered, d) =>
    filtered.some(f => f.source === d.target && f.target === d.source) ? filtered : [...filtered, d],
    []
  );
}

function writeData(data) {
  const header = Object.keys(data[0]).map(k => ({id: k, title: k}));
  const csvWriter = createCsvWriter({
    path: 'filtered-links.csv',
    header
  });

  csvWriter.writeRecords(data);
}

async function main() {
  const data = await loadData();
  console.log(data.length);

  const filteredData = filterData(data);
  console.log(filteredData.length);

  await writeData(filteredData);
}

main()
