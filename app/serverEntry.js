/**
 * Server side rendering application entry module.
 *
 * This module is being transpiled by webpack and placed under
 * server/middlewares/ as `generated.serverEntry.js`.
 *
 * The server uses it to render the app at given location.
 */
import 'babel-polyfill'; // for regeneratorRuntime

import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import { createMemoryHistory, match, RouterContext } from 'react-router';
import { END } from 'redux-saga';
import Helmet from 'react-helmet';
import styleSheet from 'styled-components/lib/models/StyleSheet';
import { addLocaleData } from 'react-intl';

// Global styles should be injected before any other scoped style, so make sure
// this file is imported before any styled component.
import 'global-styles';

import createStore from 'store';
import createRoutes from 'routes';

import HtmlDocument from 'components/HtmlDocument';
import AppRoot from 'containers/AppRoot';
import { changeLocale } from 'containers/LanguageProvider/actions';

import syncHistoryWithStore from 'setup/syncHistoryWithStore';
import monitorSagas from 'utils/monitorSagas';

function renderAppToString(store, renderProps, messages) {
  return renderToString(
    <AppRoot store={store} messages={messages}>
      <RouterContext {...renderProps} />
    </AppRoot>
  );
}

async function renderHtmlDocument({ store, renderProps, sagasDone, assets, webpackDllNames, locale, localeDataScript, messages }) {
  addLocaleData(localeDataScript);

  // 1st render phase - triggers the sagas
  renderAppToString(store, renderProps, messages);

  // send signal to sagas that we're done
  store.dispatch(END);

  // wait for all tasks to finish
  await sagasDone();

  // capture the state after the first render
  const state = store.getState().toJS();

  // 2nd render phase - the sagas triggered in the first phase are resolved by now
  const appMarkup = renderAppToString(store, renderProps, messages);

  // capture the generated css
  const css = styleSheet.injected
    ? styleSheet.rules().map((rule) => rule.cssText).join('\n')
    : '';

  const doc = renderToStaticMarkup(
    <HtmlDocument
      appMarkup={appMarkup}
      lang={locale}
      state={state}
      head={Helmet.rewind()}
      assets={assets}
      css={css}
      localeDataScript={localeDataScript}
      webpackDllNames={webpackDllNames}
    />
  );
  return `<!DOCTYPE html>\n${doc}`;
}

function is404(routes) {
  return routes.some((r) => r.name === 'notfound');
}

function renderAppToStringAtLocation(url, { webpackDllNames = [], assets, req }, callback) {
  const { locale, localeDataScript, messages } = req;
  const memHistory = createMemoryHistory(url);
  const store = createStore({ messages }, memHistory);

  syncHistoryWithStore(memHistory, store);

  const routes = createRoutes(store);

  const sagasDone = monitorSagas(store);

  store.dispatch(changeLocale(locale));

  match({ routes, location: url }, (error, redirectLocation, renderProps) => {
    if (error) {
      callback({ error });
    } else if (redirectLocation) {
      callback({ redirectLocation: redirectLocation.pathname + redirectLocation.search });
    } else if (renderProps) {
      renderHtmlDocument({ store, renderProps, sagasDone, assets, webpackDllNames, locale, localeDataScript, messages })
        .then((html) => {
          const notFound = is404(renderProps.routes);
          callback({ html, notFound });
        })
        .catch((e) => callback({ error: e }));
    } else {
      callback({ error: new Error('Unknown error') });
    }
  });
}

export {
  renderAppToStringAtLocation,
};
