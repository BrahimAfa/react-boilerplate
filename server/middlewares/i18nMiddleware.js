const { readFileSync } = require('fs');
const { basename } = require('path');
// const accepts = require('accepts');
const glob = require('glob');

// Get the supported languages by looking for translations in the `lang/` dir.
// Note glob uses `process.cwd()` as default folder where to look at.
const languages = glob.sync('./app/translations/*.json').map((filename) => basename(filename, '.json'));

// Load React Intl's locale data on the request for the user's locale and caches
// files in memory.
const localeDataCache = new Map();
const getLocaleDataScript = (locale) => {
  const lang = locale.split('-')[0];

  if (!localeDataCache.has(lang)) {
    const localeDataFile = require.resolve(`react-intl/locale-data/${lang}`);
    const localeDataScript = readFileSync(localeDataFile, 'utf8');

    localeDataCache.set(lang, localeDataScript);
  }

  return localeDataCache.get(lang);
};

// Load and expose the translations on the request for the user's locale.
const getMessages = (locale) => require(`../../app/translations/${locale}.json`);  // eslint-disable-line global-require, import/no-dynamic-require

/**
 * This middlewares is responsible to retrieve react-intl locale and our custom
 * localized messages and attach to the request objet.
 */
const i18nMiddleware = (req, res, next) => {
  // const accept = accepts(req);
  // const locale = accept.language(languages);
  const locale = 'es';

  /* eslint-disable no-param-reassign */
  req.locale = locale;
  req.localeDataScript = getLocaleDataScript(locale);
  req.messages = getMessages(locale);
  /* eslint-enable no-param-reassign */

  next();
};

module.exports = i18nMiddleware;
