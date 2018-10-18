# Biblio/Publications Transfer from Drupal 7 to Drupal 8

## Drupal Setup
On the Drupal 8 machine, run:
```bash
$ composer require 'drupal/bibcite:^1.0'
```
That command should install the following modules:
- drupal/ds: ^3.1
- drupal/bibcite: ^1.0
- audiolabs/bibtexparser: dev-master

(and these ones, but I'm not sure:)
- academicpuma/citeproc-php: ~1.0
- adci/full-name-parser: ^0.2
- technosophos/LibRIS: ~2.0
- caseyamcl/php-marc21: ~1.0
  
Copy the `Bibcite` and `view.publications` Drupal configuration from `https://linqs.soe.ucsc.edu` to your site. This will create a `view` at `/publications` (aliased to `/biblio`) containing all of the Biblio references you upload.

Add the following CSS to your site:
```css
.bibcite-links ul.inline {
  display: flex;
}
```

Add the following JavaScript to your site:
```js
var $ = window.jQuery || window.$ || window.jquery;
$(() => {
  if ($('.view-publications').length) {
  // Add links for filtering on /publications page
    $('td.views-field-keywords-target-id > a').each((i, el) => {
      el.setAttribute('href', '/publications?name=' + encodeURIComponent(el.textContent));
    });
    $('td.views-field-author-target-id > a').each((i, el) => {
      var names = el.textContent.split(/\s+/);
      var first = names[0] || '';
      var last = names[1] || '';

      el.setAttribute('href', '/publications?first_name=' + encodeURIComponent(first) + '&last_name=' + encodeURIComponent(last));
    });
  }
});
```

## Directions for Transfering
1. Install `node.js` version 8 and up (I like to use [nvm](https://github.com/creationix/nvm#installation))
2. Clone this repository on your local machine and `cd` to that directory
3. `$ npm install`
4. `$ node export-biblio.js <website_url>/biblio` (This downloads a bibtex file and PDFs. [See documentation](#export-biblio-documentation))
5. Move downloaded PDFs to your website's files. Their public url must be: `<website_url>/files/papers/`
6. Go to `<website_url>/admin/config/bibcite/import`, and import the bibtex file created in step 4
7. Done!

## `export-biblio` Documentation
```
Usage: node export-biblio.js [options] <biblio_url>

Export the Drupal Biblio module from `biblio_url` to a Bibtex file and download associated PDFs

Options:

  -b, --bibtex <file>  Specifies the output Bibtex filename. Defaults to `bibtex.bib`
  -n, --pages <n>      Number of biblio HTML pages to look at. This is handled automatically by default
  -p, --papers <dir>   Directory to download PDF papers. Defaults to `papers/`
  -h, --help           output usage information

Example: node export-biblio.js https://linqs.soe.ucsc.edu/biblio
```
