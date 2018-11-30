# Biblio/Publications Transfer from Drupal 7 to Drupal 8

This repository will walk you through how to migrate publications from the Drupal 7 `biblio` module to the Drupal 8 `bibcite` module.

## Drupal Setup
1. On the Drupal 8 machine, run:
    ```bash
    $ composer require 'drupal/bibcite:^1.0' 'drupal/ds:^3.1'
    ```

2. Enable and install the following modules on your Drupal 8 site by visiting `<website_url>/admin/modules`:
    - Bibliography & Citation
    - Bibliography & Citation - Entity
    - Bibliography & Citation - Export
    - Bibliography & Citation - import
    - Bibliography & Citation - BibTeX
    - Display Suite
  
3. Import all of the Drupal configuration files from the [config_import](/config_import) directory to your site by running the following commands on the Drupal machine:
    ```bash
    $ git clone https://github.com/wyattades/biblio_to_bibcite /tmp/bib_config
    $ drush cim --partial --source=/tmp/bib_config/config_import
    ```
    (You may need to run the latter command a second time if not all files import the first time)

4. Add the following CSS to your site:
    ```css
    .bibcite-links ul.inline {
      display: flex;
    }
    ```

5. Add the following JavaScript to your site:
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
1. Install `node.js` version 8 and up
2. Clone this repository on your local machine and `cd` to that directory
3. `$ npm install`
4. `$ node export-biblio.js <website_url>/biblio` (This downloads a bibtex file and PDFs. [See documentation](#export-biblio-documentation))
5. Move downloaded PDFs to your website's files. Their public url must be: `<website_url>/sites/default/files/papers/`
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

Example: node export-biblio.js https://example-drupal7-site.com/biblio
```
