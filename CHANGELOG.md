# Changelog

## 0.1.0

First release.

- `.mars` and `.mrs` files are recognised as Marslang, with a TextMate grammar
  covering keywords, bindings, type annotations, families, decorators, imports,
  error families, strings, numbers, and comments.
- `marslang check` runs when a file is opened and saved, and its error is shown
  on the line it belongs to. An error the interpreter cannot place is shown on
  the name it quotes.
- Snippets for the entry point, functions, families, private methods, error
  handling, loops, and imports.
- **Marslang: Run File** runs the open file in a terminal.
