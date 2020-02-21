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
  const connectionData = await loadData('data/filtered_persons_projects.csv');

  const result = filterData
    .map(d => {
      const sD = subjectData.find(s => d.project_id_number === s.project_id);
      const cD = connectionData.filter(c => d.project_id_number === c.project_id_number);
      return {
        project_id_number: d.project_id_number,
        title: d.title,
        funding_start_year: d.funding_start_year,
        funding_end_year: d.funding_end_year,
        institution_id: d.institution_id,
        institution_name: d.institution_name,
        duration: d.duration,
        subject: sD ? sD.review_board : undefined,
        person_ids: cD.map(c => c.person_id)
      }
    })
    .filter(d => d.person_ids.length);

  writeData(result);
}

main()
