import * as React from 'react';

import { ReactWidget } from '@jupyterlab/ui-components';

function MyComponent() {
    return <div>My Widget</div>;
}
export class CLIMBReactWidget extends ReactWidget {
    render() {
        return <MyComponent />;
    }
}