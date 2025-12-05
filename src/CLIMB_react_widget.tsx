import * as React from 'react';

import App from 'climb-dashboard-gui';

import { ReactWidget } from '@jupyterlab/ui-components';
import { requestAPI } from './handler';

export class CLIMBReactWidget extends ReactWidget {

  constructor() {
    super();

    this.node.classList.add('climb-jupyter', 'climb-stats');
  }

    render() {

        const userInfoHandler = async () => {
            return requestAPI<any>("get-env")
        }

        const resourcesHandler = async () => {
            return requestAPI<any>("resources");
        }

        const volumesHandler = async () => {
            return requestAPI<any>('disk-usage');
        }

      return <App
            userInfoHandler={userInfoHandler}
            resourcesHandler={resourcesHandler}
            volumesHandler={volumesHandler}
        />;
    }

}
