const bibtex = require('bibtex-parse-js');
const cheerio = require('cheerio');
const program = require('commander');
const https = require('https');
const fs = require('fs-extra');
const url = require('url');
const path = require('path');


const download = (url, downloadPath) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    if (downloadPath) {
      const stream = fs.createWriteStream(downloadPath);
      stream.on('close', resolve);
      res.pipe(stream);
    } else {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve(data));
    }
  })
  .on('error', reject);
});

// Modified version of bibtex-parse-js
const toBibtex = (json) => {
  let out = '';
  for (let i in json) {
      out += "@" + json[i].entryType;
      out += '{';
      if (json[i].citationKey)
          out += json[i].citationKey + ',\n';
      if (json[i].entry)
          out += json[i].entry ;
      if (json[i].entryTags) {
          let tags = '';
          for (let jdx in json[i].entryTags) {
              if (tags.length != 0)
                  tags += ',\n';
              tags += jdx + ' = {' + json[i].entryTags[jdx] + '}';
          }
          out += tags + '\n';
      }
      out += '}\n';
  }
  return out;
};

const getBibAndPdfs = async (biblioUrl, outputFile = 'bibtex.bib', pages, papersDir = 'papers/') => {

  let html = await download(biblioUrl);
  let $ = cheerio.load(html);

  let bibDownload = $('.biblio-export .biblio_bibtex a[href]').attr('href');
  if (!bibDownload) {
    bibDownload = '/biblio/export/bibtex';
    console.log('Failed to find bibtex export, using fallback:', bibDownload);
  }

  const bibString = await download(url.resolve(biblioUrl, bibDownload));
  const bibs = bibtex.toJSON(bibString);

  console.log('Parsing biblio pages...');

  const pdfs = [];  
  for (let i = 0; pages ? i < pages.length : pdfs.length < bibs.length; i++) {

    if (i > 0) {
      html = await download(`${biblioUrl}?page=${i}`);
      $ = cheerio.load(html);
    }

    let amount = 0;
    $('.biblio-entry').each((i, el) => {
      const $link = $(el).find('.biblio_file_links a');
      pdfs.push($link.length > 0 ? $link.attr('href') : null);
      amount++;
    });
    if (amount === 0) break;
  }

  if (pdfs.length !== bibs.length) throw 'Exported Bibtex count does not match Bib element count';

  for (let i = 0; i < bibs.length; i++) {
    if (pdfs[i]) {
      bibs[i].entryTags.url = pdfs[i];
    }
  }

  fs.outputFileSync(path.resolve(__dirname, outputFile), toBibtex(bibs));
  
  console.log('Successfully exported Bibtex to:', outputFile);

  fs.mkdirpSync(path.resolve(__dirname, papersDir));

  console.log('Downloading PDFs to: `' + papersDir + '`. This may take a while...');

  await Promise.all(pdfs.map((pdf) => {
    if (pdf) {
      const filename = path.basename(url.parse(pdf).pathname);
      return download(pdf, path.resolve(__dirname, papersDir, filename));
    } else {
      return Promise.resolve();
    }
  }));

  console.log('Finished Biblio export');
};


program
.description('Export the Drupal Biblio module from `biblio_url` to a Bibtex file and download associated PDFs')
.arguments('<biblio_url>')
.option('-b, --bibtex <file>', 'Specifies the output Bibtex filename. Defaults to `bibtex.bib`')
.option('-n, --pages <n>', 'Number of biblio HTML pages to look at. This is handled automatically by default', parseInt)
.option('-p, --papers <dir>', 'Directory to download PDF papers. Defaults to `papers/`')
.on('--help', () => {
  console.log('  Example: node export-biblio.js https://linqs.soe.ucsc.edu/biblio');
  console.log();
})
.parse(process.argv);


const biblioUrl = program.args[0];
if (!biblioUrl) {
  program.outputHelp();
  process.exit(1);
}

getBibAndPdfs(biblioUrl, program.output, program.pages, program.papers)
.catch((err) => {
  console.error(err);
  process.exit(1);
});
