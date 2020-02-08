const csv = require('csvtojson')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

function loadData(file) {
  return csv().fromFile(file);
}

function writeData(data) {
  const header = Object.keys(data[0]).map(k => ({id: k, title: k}));
  const csvWriter = createCsvWriter({
    path: 'data/filtered_data.csv',
    header
  });

  csvWriter.writeRecords(data);
}

async function main() {
  const filterData = await loadData('data/filter_data.csv');
  const subjectData = await loadData('data/subject_data.csv');
  console.log(subjectData);

  const result = filterData.map(d => {
    const sD = subjectData.find(s => d.project_id_number === s.project_id);
    return {
      project_id_number: d.project_id_number,
      title: d.title,
      funding_start_year: d.funding_start_year,
      funding_end_year: d.funding_end_year,
      institution_id: d.institution_id,
      institution_name: d.institution_name,
      duration: d.duration,
      subject: sD ? sD.review_board : undefined
    }
  });

  await writeData(result);
}

main()
