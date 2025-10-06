import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the climb_usage_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'climb_usage_extension:plugin',
  description: 'A JupyterLab extension to query CLIMB resource usage',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension climb_usage_extension is activated!');

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The climb_usage_extension server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
