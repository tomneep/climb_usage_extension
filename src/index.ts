import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

class APODWidget extends Widget {
    /**
     * Construct a new APOD widget.
     */
    constructor() {
	super();

	this.addClass('my-apodWidget');


	// Add a user element to the panel
	this.user = document.createElement('p');
	this.node.appendChild(this.user);

	// Add a group element to the panel
	this.group = document.createElement('p');
	this.node.appendChild(this.group);


	// Get username and group on connection
        requestAPI<any>('get-env')
            .then(data => {		
		console.log(data);
		this.user.innerText = data['user'];
		this.group.innerText = data['group'];
            })
            .catch(reason => {
		console.error(
                    `The climb_usage_extension server extension appears to be missing.\n${reason}`
		);
            });

	
    }

    private user: HTMLParagraphElement;
    private group: HTMLParagraphElement;

    /**
     * Handle update requests for the widget.
     */
    async updateAPODImage(): Promise<void> {

    }
}
/**
 * Activate the APOD widget extension.
 */
function activate(app: JupyterFrontEnd, palette: ICommandPalette) {
    console.log('JupyterLab extension jupyterlab_apod is activated!');

    // Define a widget creator function
    const newWidget = () => {
	const content = new APODWidget();
	const widget = new MainAreaWidget({content});
	widget.id = 'apod-jupyterlab';
	widget.title.label = 'Astronomy Picture';
	widget.title.closable = true;
	return widget;
    }

    // Create a single widget
    let widget = newWidget();

    // Add an application command
    const command: string = 'apod:open';
    app.commands.addCommand(command, {
	label: 'Random Astronomy Picture',
	execute: () => {
	    // Regenerate the widget if disposed
	    if (widget.isDisposed) {
		widget = newWidget();
	    }
	    if (!widget.isAttached) {
		// Attach the widget to the main work area if it's not there
		app.shell.add(widget, 'main');
	    }
	    // Refresh the picture in the widget
	    widget.content.updateAPODImage();
	    // Activate the widget
	    app.shell.activateById(widget.id);
	}
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'Tutorial' });
}

/**
 * Initialization data for the climb_usage_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: 'climb_usage_extension:plugin',
    description: 'A JupyterLab extension to query CLIMB resource usage',
    autoStart: true,
    requires: [ICommandPalette],
    activate: activate
};

export default plugin;
