# Change Log
All notable changes to the "vscode-psl" extension will be documented in this file.

## v1.1.1 (preview)

Introduced toggle to enable preview features (`"psl.previewFeatures" : true`). Restart after configuring to enable.

#### release candidate 0
- Hover and go-to definitions.
- Actions for missing separator and documentation on methods.

## v1.1.0
Implementation of the psl-lint code quality checker. Enable it by adding the setting `"psl.lint" : true` to your settings.json.

## v1.0.1
Fix a small bug where the Configure Environments button does not update properly.

## v1.0.0
Promote to 1.0.0 stable. Introduces language support.

- Tokenizer and parser
- Data item support
- Outlines for PSL entities
- Record completion items
- Fixes to environment configuration interface

## v0.0.1
Initial publication.

- Get/Refresh, Send, Run, Test Compile, and Compile and Link.
- Multi-environment configurations
- Terminal support
- PSL and table item syntax coloring