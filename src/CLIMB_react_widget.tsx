import * as React from 'react';

import Main from 'climb-dashboard-gui';

import { ReactWidget } from '@jupyterlab/ui-components';
import { requestAPI } from './handler';



export class CLIMBReactWidget extends ReactWidget {

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

        return <Main
            userInfoHandler={userInfoHandler}
            resourcesHandler={resourcesHandler}
            volumesHandler={volumesHandler}
        />;
    }

}
