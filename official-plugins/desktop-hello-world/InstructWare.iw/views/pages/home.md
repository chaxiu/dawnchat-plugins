# page_home

## Layout Tree

- one centered hello card with title, hint text, and name input

## Interaction Hooks

- update local greeting text when user edits the input name
- view implementation resides in `_ir/frontend/web-src/src/views/pages/home/**`

## Display Rules

- [text] show `Hello, {name}!`
- [text] show backend endpoint hint `GET /api/hello?name=...`

## Data Bindings

- default input name is `DawnChat`
- empty input fallback name is `World`
