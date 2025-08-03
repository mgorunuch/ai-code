#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app';

const cli = meow(
	`Usage ai-code`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
			},
		},
	},
);

render(<App name={cli.flags.name} />);
