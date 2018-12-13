const cheerio = require('cheerio');
const program = require('commander');
const https = require('https');
const fs = require('fs-extra');
const url = require('url');
const path = require('path');
const bibtexParse = require('bibtex-parse-js');


const download = (url, downloadPath) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    if (downloadPath) {
      const stream = fs.createWriteStream(downloadPath);
      stream.once('close', resolve);
      res.pipe(stream);
    } else {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.once('end', () => resolve(data));
    }
  })
  .on('error', reject);
});

// Modified version of bibtex-parse-js
const toBibtex = (json) => {
  let out = '';
  for (const row of json) {
      out += "@" + row.entryType;
      out += '{';
      if (row.citationKey)
          out += row.citationKey + ',\n';
      if (row.entry)
          out += row.entry ;
      if (row.entryTags) {
          let tags = '';
          for (let jdx in row.entryTags) {
              if (tags.length != 0)
                  tags += ',\n';
              tags += '  ' + jdx + ' = {' + row.entryTags[jdx] + '}';
          }
          out += tags + '\n';
      }
      out += '}\n';
  }
  return out;
};

const waitForKeypress = () => {
  process.stdin.setRawMode(true);
  return new Promise(resolve => {
    process.stdin.once('data', (data) => {
      const byteArray = [...data]
      if (byteArray.length > 0 && byteArray[0] === 3) {
        process.exit(1)
      }
      process.stdin.setRawMode(false);
      resolve();
    });
  });
};

const getBibAndPdfs = async (biblioUrl, outputFile = 'bibtex.bib', pages, papersDir = 'papers/') => {

  let html = await download(biblioUrl);
  let $ = cheerio.load(html);

  let bibDownload = $('.biblio-export .biblio_bibtex a[href]').attr('href');
  if (!bibDownload) {
    bibDownload = '/biblio/export/bibtex';
    console.log('Failed to find bibtex export, using fallback:', bibDownload);
  }

  let bibString = await download(url.resolve(biblioUrl, bibDownload));
  let bibs;
  while (!bibs) {
    try {
      bibs = bibtexParse.toJSON(bibString);
    } catch (e) {
      await fs.outputFile('FIXME.bib', bibString);
      console.error((typeof e === 'object' ? e.message : e).substring(0, 300));
      console.error('Fix the error in the file "FIXME.bib", then press any key to continue');
      await waitForKeypress();
      bibString = await fs.readFile('FIXME.bib', 'utf8');
      await fs.remove('FIXME.bib');
    }
  }

  console.log('Parsing biblio pages...');

  const pdfs = [];  
  let first = null;
  for (let page = 0; page < (pages ? pages : 100); page++) {

    if (page > 0) {
      html = await download(`${biblioUrl}?page=${page}`);
      $ = cheerio.load(html);
    }

    const els = $('.biblio-entry').toArray();

    if (els.length > 0) {
      const href = $(els[0]).children('a').attr('href');
      if (first === href) break;
      else first = href;
    } else break;

    console.log('Found ' + els.length + ' entries on page ' + page);

    for (let i = 0; i < els.length; i++) {
      const $link = $(els[i]).find('.biblio_file_links a');
      pdfs.push($link.length > 0 ? $link.attr('href') : null);
    }
  }

  if (pdfs.length !== bibs.length)
    throw `Exported Bibtex count (${bibs.length}) does not match publication element count (${pdfs.length})`;

  for (let i = 0; i < bibs.length; i++) {
    const tags = bibs[i].entryTags;
    if (tags.attachments) delete tags.attachments;
    if (tags.url) {
      tags.original_publication = tags.url;
      delete tags.url;
    }
    if (pdfs[i]) {
      const filename = path.basename(url.parse(pdfs[i]).pathname);
      tags.url = `/sites/default/files/papers/${filename}`;
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
.then(() => process.exit(0))
.catch((err) => {
  console.error(err);
  process.exit(1);
});
