#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ console-app

	Options
		--name     Your name
		--settings Open settings menu

	Examples
	  $ console-app --name=Jane
	  Hello, Jane
	  
	  $ console-app --settings
	  Opens the settings menu for API keys
`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
			},
			settings: {
				type: 'boolean',
			},
		},
	},
);

render(<App name={cli.flags.name} settings={cli.flags.settings} />);
