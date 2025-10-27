import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';

import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';

import cloudIconSvg from '../style/icons/cloud.svg';

import { CLIMBWidget } from './CLIMB_widget';

import '../style/index.css';

export const cloudIcon = new LabIcon({
  name: 'climb-jupyterlab-extension:cloud_icon',
  svgstr: cloudIconSvg
});

/**
 * Activate the CLIMB widget extension.
 */
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  launcher: ILauncher | null
) {
  console.log('JupyterLab extension jupyterlab_climb is activated!');

  // Define a widget creator function
  const newWidget = () => {
    const content = new CLIMBWidget();
    const widget = new MainAreaWidget({ content });
    widget.id = 'climb-jupyterlab';
    widget.title.label = 'CLIMB stats';
    widget.title.closable = true;
    return widget;
  };

  // Create a single widget
  let widget = newWidget();

  // Add an application command
  const command: string = 'climb:open';
  app.commands.addCommand(command, {
    label: 'CLIMB dashboard',
    caption: 'CLIMB dashboard',
    icon: cloudIcon,
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
  palette.addItem({ command, category: 'CLIMB' });

  if (launcher) {
    launcher.add({ command, category: 'CLIMB' });
  }
}

/**
 * Initialization data for the climb_usage_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'climb_usage_extension:plugin',
  description: 'A JupyterLab extension to query CLIMB resource usage',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ILauncher],
  activate: activate
};

export default plugin;
