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

	this.descriptionList = document.createElement('dl');
	this.node.appendChild(this.descriptionList);

	this.memory_usage = document.createElement('progress');

	const user_dt = document.createElement('dt');
	const group_dt = document.createElement('dt');
	const cpus_dt = document.createElement('dt');
	const mem_usage_dt = document.createElement('dt');

	user_dt.textContent = 'User';
	group_dt.textContent = 'Group';
	cpus_dt.textContent = 'CPUs';
	mem_usage_dt.textContent = 'Memory usage';


	const user = document.createElement('dd');
	const group = document.createElement('dd');
	const cpus = document.createElement('dd');
	const mem_usage = document.createElement('dd');
	mem_usage.appendChild(this.memory_usage)

	// Get username and group on connection
        requestAPI<any>('get-env')
            .then(data => {
		console.log(data);
		// this.user.innerText = data['user'];
		// this.group.innerText = data['group'];
		user.textContent = data['user'];
		this.descriptionList.appendChild(user_dt);
		this.descriptionList.appendChild(user);
		group.textContent = data['group'];
		this.descriptionList.appendChild(group_dt);
		this.descriptionList.appendChild(group);

            })
            .catch(reason => {
		console.error(
                    `The climb_usage_extension server extension appears to be missing.\n${reason}`
		);
            });

	// Get username and group on connection
        requestAPI<any>('limits')
            .then(data => {
		console.log(data);
		cpus.textContent = data['cpu_limit'];
		this.descriptionList.appendChild(cpus_dt);
		this.descriptionList.appendChild(cpus);
		this.memory_usage.max = data['max_memory'];
		this.descriptionList.appendChild(mem_usage_dt);
		this.descriptionList.appendChild(mem_usage);
		// this.cpu_limit.innerText = data['cpu_limit'];
            })
            .catch(reason => {
		console.error(
                    `The climb_usage_extension server extension appears to be missing.\n${reason}`
		);
            });


    }

    async onUpdateRequest(): Promise<void> {
	try {
	    const data = await requestAPI<any>('current-memory');
	    this.memory_usage.value = data["value"];

	} catch (err) {
	    console.error('Error fetching metrics:', err);
	}
    }

    onAfterAttach(): void {
	// Start polling when widget is attached to the DOM
	this.onUpdateRequest();
	this.intervalId = window.setInterval(() => this.onUpdateRequest(), this.pollInterval);
    }

    onBeforeDetach(): void {
	// Stop polling when the widget is removed
	if (this.intervalId !== null) {
	    clearInterval(this.intervalId);
	    this.intervalId = null;
	}
    }

    // private user: HTMLParagraphElement;
    // private group: HTMLParagraphElement;
    // private cpu_limit: HTMLParagraphElement;
    private memory_usage: HTMLProgressElement;

    private descriptionList: HTMLDListElement;

    private intervalId: number | null = null;
    private pollInterval = 5000; // 5 seconds

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
